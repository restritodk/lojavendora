"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus } from "@/app/generated/prisma/client";
import { getCurrentCustomer, deleteCustomerSession } from "@/lib/customer-auth";
import {
  expireApprovedReturnRequests,
  expirePendingOrders,
  getReturnPostingExpiresAt,
  isPaymentExpired,
} from "@/lib/orders/payment-lifecycle";
import { prisma } from "@/lib/prisma";
import { uploadFileToR2 } from "@/lib/r2-storage";
import { refundGatewayPayment } from "@/lib/payments/gateways";

export type CustomerPanelResult = {
  type: "success" | "error";
  message: string;
};

export async function cancelCustomerOrderAction(
  slug: string,
  formDataOrOrderId: FormData | string,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  await expirePendingOrders(context.store.id);

  const orderId = typeof formDataOrOrderId === "string"
    ? formDataOrOrderId
    : getValue(formDataOrOrderId, "orderId");
  const reason = typeof formDataOrOrderId === "string"
    ? "Cancelado pelo comprador"
    : getValue(formDataOrOrderId, "reason");
  const otherReason = typeof formDataOrOrderId === "string"
    ? ""
    : getValue(formDataOrOrderId, "otherReason");

  if (!reason || (reason === "Outro motivo" && !otherReason)) {
    return result("error", "Informe o motivo do cancelamento.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: context.store.id,
      customerId: context.customer.id,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      integrationStatus: true,
      total: true,
      paymentMethod: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado para esta loja.");
  }

  if (
    order.status === OrderStatus.CANCELED ||
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.SHIPPED
  ) {
    return result("error", "Este pedido não pode mais ser cancelado pelo comprador.");
  }

  const refund = order.paymentStatus === "pago"
    ? await requestOrderRefund(context.store.id, order.paymentMethod, order.integrationStatus, Number(order.total))
    : null;

  if (order.paymentStatus === "pago" && refund?.status === "failed") {
    return result("error", refund.message);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: {
        id: order.id,
        storeId: context.store.id,
        customerId: context.customer.id,
      },
      data: {
        status: OrderStatus.CANCELED,
        paymentStatus: refund?.status === "refunded"
          ? "estornado"
          : refund?.status === "requested"
            ? "estorno_solicitado"
            : "cancelado",
        integrationStatus: {
          ...normalizeJsonObject(order.integrationStatus),
          customerCanceledAt: new Date().toISOString(),
          cancelReason: reason,
          cancelOtherReason: otherReason,
          refund,
        },
      },
    });
    await tx.orderCancellation.create({
      data: {
        orderId: order.id,
        customerId: context.customer.id,
        actorType: "customer",
        reason,
        otherReason: otherReason || null,
        refundStatus: refund?.status,
        refundProviderId: refund?.providerRefundId,
        refundMessage: refund?.message,
        previousStatus: order.status,
        newStatus: OrderStatus.CANCELED,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        actorType: "customer",
        actorId: context.customer.id,
        previousStatus: order.status,
        nextStatus: OrderStatus.CANCELED,
        note: reason === "Outro motivo" ? otherReason : reason,
      },
    });
  });

  revalidatePath(`/store/${slug}/pedidos`);
  revalidatePath("/dashboard/pedidos");
  return result(
    "success",
    refund
      ? `Pedido cancelado com sucesso. ${refund.message}`
      : "Pedido cancelado com sucesso.",
  );
}

export async function confirmCustomerDeliveryAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  const orderId = getValue(formData, "orderId");
  const rating = Number(getValue(formData, "rating"));
  const comment = getValue(formData, "comment");

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return result("error", "Informe uma nota de 1 a 5.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: context.store.id,
      customerId: context.customer.id,
    },
    include: {
      items: true,
    },
  });

  if (
    !order ||
    (
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.REFUNDED
    )
  ) {
    return result("error", "Este pedido não está disponível para avaliação.");
  }

  const attachments = [
    ...await normalizeMediaAttachments(formData.getAll("reviewFiles"), "reviews"),
    ...normalizeCapturedPhotoAttachments(formData.getAll("reviewCapturedPhotos")),
  ];
  const firstItem = order.items[0];

  await prisma.$transaction(async (tx) => {
    if (order.status === OrderStatus.SHIPPED) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          integrationStatus: {
            ...normalizeJsonObject(order.integrationStatus),
            customerDeliveredAt: new Date().toISOString(),
          },
        },
      });
    }

    for (const item of order.items) {
      if (!item.productId) continue;
      const review = await tx.productReview.create({
        data: {
          storeId: context.store.id,
          orderId: order.id,
          productId: item.productId,
          customerId: context.customer.id,
          rating,
          comment,
        },
      });
      if (item.id === firstItem?.id && attachments.length > 0) {
        await tx.reviewAttachment.createMany({
          data: attachments.map((attachment) => ({
            reviewId: review.id,
            url: attachment.url,
            type: attachment.type,
            fileName: attachment.fileName,
          })),
        });
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        actorType: "customer",
        actorId: context.customer.id,
        previousStatus: order.status,
        nextStatus: order.status === OrderStatus.SHIPPED ? OrderStatus.DELIVERED : "ORDER_REVIEWED",
        note: order.status === OrderStatus.SHIPPED
          ? "Entrega confirmada pelo comprador."
          : "Pedido avaliado pelo comprador.",
      },
    });
  });

  revalidatePath(`/store/${slug}/pedidos`);
  revalidatePath(`/store/${slug}`);
  revalidatePath("/dashboard/pedidos");
  return result("success", "Entrega confirmada e avaliação enviada.");
}

export async function requestCustomerReturnAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  const orderId = getValue(formData, "orderId");
  const reason = getValue(formData, "reason");
  const otherReason = getValue(formData, "otherReason");
  const observation = getValue(formData, "observation");

  if (!reason || (reason === "Outro motivo" && !otherReason)) {
    return result("error", "Informe o motivo da devolução.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: context.store.id,
      customerId: context.customer.id,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      integrationStatus: true,
    },
  });

  if (!order || order.status !== OrderStatus.DELIVERED) {
    return result("error", "A devolução só pode ser solicitada após a confirmação da entrega.");
  }

  if (isReturnWindowExpired(order.integrationStatus)) {
    return result(
      "error",
      "O prazo de 7 dias corridos após a confirmação da entrega expirou. Não é mais possível solicitar devolução para este pedido.",
    );
  }

  if (hasCompletedReturnOrRefund(order)) {
    return result("error", "Este pedido já possui devolução concluída ou estorno registrado.");
  }

  const existing = await prisma.orderReturnRequest.findFirst({
    where: {
      orderId: order.id,
      status: { notIn: ["REJECTED"] },
    },
    select: { id: true },
  });

  if (existing) {
    return result("error", "Já existe uma solicitação de devolução para este pedido.");
  }

  const attachments = [
    ...await normalizeMediaAttachments(formData.getAll("returnFiles"), "returns"),
    ...normalizeCapturedPhotoAttachments(formData.getAll("returnCapturedPhotos")),
  ];

  await prisma.$transaction(async (tx) => {
    const request = await tx.orderReturnRequest.create({
      data: {
        orderId: order.id,
        customerId: context.customer.id,
        status: "REQUESTED",
        reason,
        otherReason: otherReason || null,
        observation: observation || null,
      },
    });
    if (attachments.length > 0) {
      await tx.returnAttachment.createMany({
        data: attachments.map((attachment) => ({
          returnRequestId: request.id,
          url: attachment.url,
          type: attachment.type,
          fileName: attachment.fileName,
          purpose: "request",
        })),
      });
    }
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        actorType: "customer",
        actorId: context.customer.id,
        previousStatus: order.status,
        nextStatus: "RETURN_REQUESTED",
        note: reason === "Outro motivo" ? otherReason : reason,
      },
    });
  });

  revalidatePath(`/store/${slug}/pedidos`);
  revalidatePath("/dashboard/pedidos");
  return result("success", "Solicitação de devolução enviada para a loja.");
}

export async function submitReturnShipmentProofAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  await expireApprovedReturnRequests(context.store.id);

  const returnRequestId = getValue(formData, "returnRequestId");
  const trackingCode = getValue(formData, "trackingCode");
  const observation = getValue(formData, "observation");
  const attachments = [
    ...await normalizeMediaAttachments(formData.getAll("returnProofFiles"), "return-proofs"),
    ...normalizeCapturedPhotoAttachments(formData.getAll("returnProofCapturedPhotos")),
  ];

  if (attachments.length === 0) {
    return result("error", "Anexe o comprovante da devolução.");
  }

  const request = await prisma.orderReturnRequest.findFirst({
    where: {
      id: returnRequestId,
      customerId: context.customer.id,
      order: { storeId: context.store.id },
      status: "APPROVED",
    },
    select: {
      id: true,
      orderId: true,
      updatedAt: true,
      order: { select: { status: true } },
    },
  });

  if (!request) {
    return result("error", "Solicitação de devolução não encontrada ou ainda não aprovada.");
  }

  if (getReturnPostingExpiresAt(request.updatedAt).getTime() <= Date.now()) {
    await expireApprovedReturnRequests(context.store.id);
    return result(
      "error",
      "O prazo de 3 dias para enviar a devolução expirou. O pedido foi concluído como entregue com sucesso.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderReturnRequest.update({
      where: { id: request.id },
      data: {
        status: "SHIPPED_BY_CUSTOMER",
        customerTrackingCode: trackingCode || null,
        customerReturnNote: observation || null,
      },
    });
    await tx.returnAttachment.createMany({
      data: attachments.map((attachment) => ({
        returnRequestId: request.id,
        url: attachment.url,
        type: attachment.type,
        fileName: attachment.fileName,
        purpose: "shipment-proof",
      })),
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: request.orderId,
        actorType: "customer",
        actorId: context.customer.id,
        previousStatus: request.order.status,
        nextStatus: "RETURN_SHIPPED_BY_CUSTOMER",
        note: "Comprador enviou comprovante da devolução.",
      },
    });
  });

  revalidatePath(`/store/${slug}/pedidos`);
  revalidatePath("/dashboard/pedidos");
  return result("success", "Comprovante da devolução enviado para a loja.");
}

export async function submitCustomerPaymentProofAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  await expirePendingOrders(context.store.id);

  const orderId = getValue(formData, "orderId");
  const payerName = getValue(formData, "payerName");
  const payerDocument = onlyDigits(getValue(formData, "payerDocument"));
  const receiptFile = formData.get("receiptFile");

  if (!payerName || !payerDocument) {
    return result("error", "Informe nome e CPF/CNPJ de quem pagou.");
  }

  const receiptAttachment = await normalizeReceiptAttachment(receiptFile);

  if (!receiptAttachment) {
    return result("error", "Anexe o comprovante de pagamento.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: context.store.id,
      customerId: context.customer.id,
      paymentMethod: "pix-deposito",
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado para esta loja.");
  }

  if (order.status === OrderStatus.CANCELED || order.paymentStatus === "cancelado" || isPaymentExpired(order.createdAt)) {
    return result("error", "Este pedido expirou e não pode mais receber comprovante.");
  }

  await prisma.order.updateMany({
    where: {
      id: order.id,
      storeId: context.store.id,
      customerId: context.customer.id,
    },
    data: {
      paymentStatus: "processando",
      integrationStatus: {
        ...normalizeJsonObject(order.integrationStatus),
        paymentProof: {
          payerName,
          payerDocument,
          receiptUrl: receiptAttachment,
          submittedAt: new Date().toISOString(),
        },
        paymentVisibility: "merchant-review",
      },
    },
  });

  revalidatePath(`/store/${slug}/pedidos`);
  revalidatePath("/dashboard/pedidos");
  return result("success", "Comprovante enviado. Aguarde a confirmação da loja.");
}

export async function updateCustomerProfileAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  const name = getValue(formData, "name");
  const phone = getValue(formData, "phone");
  const document = onlyDigits(getValue(formData, "document"));
  const avatarFile = formData.get("avatarFile");
  const notes = parseCustomerNotes(context.customer.notes);
  const avatarUrl = await normalizeAvatarAttachment(avatarFile, getValue(formData, "currentAvatarUrl"));

  if (!name || !phone) {
    return result("error", "Informe nome e telefone.");
  }

  await prisma.customer.updateMany({
    where: {
      id: context.customer.id,
      storeId: context.store.id,
    },
    data: {
      name,
      phone,
      document: document || null,
      personType: document.length === 14 ? "JURIDICA" : "FISICA",
      notes: JSON.stringify({
        ...notes,
        avatarUrl,
      }),
    },
  });

  revalidatePath(`/store/${slug}/pedidos`);
  return result("success", "Perfil atualizado com sucesso.");
}

export async function saveCustomerAddressAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  const address = {
    id: getValue(formData, "addressId") || crypto.randomUUID(),
    label: getValue(formData, "label") || "Endereço de entrega",
    zipCode: getValue(formData, "zipCode"),
    street: getValue(formData, "street"),
    number: getValue(formData, "number"),
    complement: getValue(formData, "complement"),
    neighborhood: getValue(formData, "neighborhood"),
    city: getValue(formData, "city"),
    state: getValue(formData, "state"),
    isDefault: getValue(formData, "isDefault") === "true",
  };

  if (!address.zipCode || !address.street || !address.number || !address.city || !address.state) {
    return result("error", "Preencha o endereço completo.");
  }

  const notes = parseCustomerNotes(context.customer.notes);
  const addresses = normalizeAddresses(notes.addresses);
  const nextAddresses = upsertAddress(addresses, address).map((item) => ({
    ...item,
    isDefault: address.isDefault ? item.id === address.id : item.isDefault,
  }));
  const hasDefault = nextAddresses.some((item) => item.isDefault);
  const finalAddresses = hasDefault
    ? nextAddresses
    : nextAddresses.map((item, index) => ({ ...item, isDefault: index === 0 }));
  const defaultAddress = finalAddresses.find((item) => item.isDefault) ?? finalAddresses[0];

  await prisma.customer.updateMany({
    where: {
      id: context.customer.id,
      storeId: context.store.id,
    },
    data: {
      zipCode: defaultAddress.zipCode,
      street: defaultAddress.street,
      number: defaultAddress.number,
      complement: defaultAddress.complement || null,
      neighborhood: defaultAddress.neighborhood,
      city: defaultAddress.city,
      state: defaultAddress.state,
      notes: JSON.stringify({
        ...notes,
        addresses: finalAddresses,
      }),
    },
  });

  revalidatePath(`/store/${slug}/pedidos`);
  return result("success", "Endereço salvo com sucesso.");
}

export async function changeCustomerPasswordAction(
  slug: string,
  formData: FormData,
): Promise<CustomerPanelResult> {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return context;
  }

  const currentPassword = getValue(formData, "currentPassword");
  const password = getValue(formData, "password");
  const confirmPassword = getValue(formData, "confirmPassword");

  if (!context.customer.password) {
    return result("error", "Esta conta não possui senha cadastrada.");
  }

  const isValid = await bcrypt.compare(currentPassword, context.customer.password);

  if (!isValid) {
    return result("error", "Senha atual inválida.");
  }

  if (password.length < 6) {
    return result("error", "A nova senha precisa ter pelo menos 6 caracteres.");
  }

  if (password !== confirmPassword) {
    return result("error", "As senhas não conferem.");
  }

  await prisma.customer.updateMany({
    where: {
      id: context.customer.id,
      storeId: context.store.id,
    },
    data: {
      password: await bcrypt.hash(password, 10),
    },
  });

  return result("success", "Senha alterada com sucesso.");
}

export async function deleteCustomerAccountAction(slug: string) {
  const context = await getCustomerContext(slug);

  if ("type" in context) {
    return;
  }

  await prisma.customer.updateMany({
    where: {
      id: context.customer.id,
      storeId: context.store.id,
    },
    data: {
      accessEmail: null,
      password: null,
      notes: JSON.stringify({
        ...parseCustomerNotes(context.customer.notes),
        deletedByCustomerAt: new Date().toISOString(),
      }),
    },
  });

  await deleteCustomerSession();
  redirect(`/store/${slug}`);
}

export async function logoutCustomerAction(slug: string) {
  await deleteCustomerSession();
  redirect(`/store/${slug}`);
}

async function getCustomerContext(slug: string) {
  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    select: { id: true },
  });

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const sessionCustomer = await getCurrentCustomer(store.id);

  if (!sessionCustomer) {
    return result("error", "Faça login para continuar.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: sessionCustomer.id,
      storeId: store.id,
    },
    select: {
      id: true,
      notes: true,
      password: true,
    },
  });

  if (!customer) {
    return result("error", "Cliente não encontrado.");
  }

  return { store, customer };
}

function upsertAddress(addresses: CustomerAddress[], address: CustomerAddress) {
  const exists = addresses.some((item) => item.id === address.id);

  if (!exists) {
    return [...addresses, address];
  }

  return addresses.map((item) => (item.id === address.id ? address : item));
}

type CustomerAddress = {
  id: string;
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

function normalizeAddresses(value: unknown): CustomerAddress[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CustomerAddress => (
    Boolean(item) &&
    typeof item === "object" &&
    "id" in item &&
    "zipCode" in item &&
    typeof item.id === "string" &&
    typeof item.zipCode === "string"
  ));
}

function parseCustomerNotes(value: string | null) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function normalizeReceiptAttachment(file: FormDataEntryValue | null) {
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return "";
    }

    const r2Url = await uploadFileToR2({
      file,
      keyPrefix: "payment-proofs",
    });

    if (r2Url) {
      return r2Url;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    return `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
  }

  return "";
}

async function normalizeMediaAttachments(files: FormDataEntryValue[], keyPrefix: string) {
  const allowedTypes = ["image/", "video/"];
  const maxSize = 20 * 1024 * 1024;
  const attachments = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size <= 0) {
      continue;
    }

    if (!allowedTypes.some((type) => file.type.startsWith(type)) || file.size > maxSize) {
      continue;
    }

    const r2Url = await uploadFileToR2({
      file,
      keyPrefix,
    });
    let url = r2Url;

    if (!url) {
      const buffer = Buffer.from(await file.arrayBuffer());
      url = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    }

    attachments.push({
      url,
      type: file.type.startsWith("video/") ? "video" : "image",
      fileName: file.name,
    });
  }

  return attachments;
}

function normalizeCapturedPhotoAttachments(values: FormDataEntryValue[]) {
  return values
    .map((value, index) => {
      if (typeof value !== "string") {
        return null;
      }

      if (value.startsWith("data:image/")) {
        return {
          url: value,
          type: "image",
          fileName: `foto-camera-${index + 1}.jpg`,
        };
      }

      try {
        const parsed = JSON.parse(value) as {
          name?: unknown;
          dataUrl?: unknown;
          type?: unknown;
        };

        if (typeof parsed.dataUrl !== "string" || !parsed.dataUrl.startsWith("data:")) {
          return null;
        }

        const fileType = typeof parsed.type === "string" ? parsed.type : "";

        return {
          url: parsed.dataUrl,
          type: fileType.startsWith("video/") ? "video" : "image",
          fileName: typeof parsed.name === "string" ? parsed.name : `anexo-${index + 1}`,
        };
      } catch {
        return null;
      }
    })
    .filter((attachment): attachment is { url: string; type: string; fileName: string } => Boolean(attachment));
}

async function requestOrderRefund(
  storeId: string,
  paymentMethod: string | null,
  integrationStatus: unknown,
  amount: number,
) {
  const gatewayPayment = normalizeJsonObject(normalizeJsonObject(integrationStatus).gatewayPayment);
  const providerPaymentId = typeof gatewayPayment.providerPaymentId === "string"
    ? gatewayPayment.providerPaymentId
    : "";

  if (!providerPaymentId || !paymentMethod?.includes(":")) {
    return {
      status: "requested" as const,
      message: "Estorno registrado para processamento manual pela loja.",
    };
  }

  const gatewayId = paymentMethod.split(":")[0] ?? "";
  const setting = await prisma.storeAdvancedSetting.findFirst({
    where: {
      storeId,
      featureId: `payment:${gatewayId}`,
      active: true,
    },
    select: { values: true },
  });

  if (!setting) {
    return {
      status: "requested" as const,
      message: "Estorno registrado para processamento manual pela loja. Configuração da forma de pagamento não encontrada.",
    };
  }

  return refundGatewayPayment({
    gatewayId,
    providerPaymentId,
    amount,
    credentials: normalizeCredentialValues(setting.values),
  });
}

function normalizeCredentialValues(values: unknown): Record<string, string | string[]> {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return {};
  }

  const output: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string"))) {
      output[key] = value;
    }
  }

  return output;
}

async function normalizeAvatarAttachment(file: FormDataEntryValue | null, currentAvatarUrl: string) {
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return currentAvatarUrl;
    }

    if (file.size > 2 * 1024 * 1024) {
      return currentAvatarUrl;
    }

    const r2Url = await uploadFileToR2({
      file,
      keyPrefix: "customer-avatars",
    });

    if (r2Url) {
      return r2Url;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    return `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
  }

  return currentAvatarUrl;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function isReturnWindowExpired(integrationStatus: unknown) {
  const deliveredAt = getDeliveredAt(integrationStatus);

  if (!deliveredAt) {
    return true;
  }

  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(23, 59, 59, 999);

  return Date.now() > deadline.getTime();
}

function getDeliveredAt(integrationStatus: unknown) {
  const data = normalizeJsonObject(integrationStatus);
  const deliveryConfirmation = normalizeJsonObject(data.deliveryConfirmation);

  if (
    typeof deliveryConfirmation.deliveredDate === "string" &&
    typeof deliveryConfirmation.deliveredTime === "string"
  ) {
    const deliveredAt = new Date(`${deliveryConfirmation.deliveredDate}T${deliveryConfirmation.deliveredTime}`);

    if (!Number.isNaN(deliveredAt.getTime())) {
      return deliveredAt;
    }
  }

  if (typeof data.customerDeliveredAt === "string") {
    const deliveredAt = new Date(data.customerDeliveredAt);

    if (!Number.isNaN(deliveredAt.getTime())) {
      return deliveredAt;
    }
  }

  return null;
}

function hasCompletedReturnOrRefund(order: {
  status: OrderStatus;
  paymentStatus: string | null;
  integrationStatus: unknown;
}) {
  const data = normalizeJsonObject(order.integrationStatus);

  return (
    order.status === OrderStatus.REFUNDED ||
    order.paymentStatus === "estornado" ||
    order.paymentStatus === "estorno_solicitado" ||
    typeof data.returnRefundedAt === "string" ||
    typeof data.returnReceivedAt === "string" ||
    typeof data.refund === "object" ||
    typeof data.returnRefund === "object"
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function result(
  type: CustomerPanelResult["type"],
  message: string,
): CustomerPanelResult {
  return { type, message };
}
