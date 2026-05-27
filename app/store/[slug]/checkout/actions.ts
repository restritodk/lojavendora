"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/app/generated/prisma/client";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { confirmOrderPayment, expirePendingOrders, getPaymentExpiresAt, isPaymentExpired } from "@/lib/orders/payment-lifecycle";
import { checkGatewayPaymentStatus, createGatewayPayment } from "@/lib/payments/gateways";
import { createPixPayment } from "@/lib/pix";
import { canCreateOrder } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { calculatePromotionsForCheckout, incrementCouponUsage } from "@/lib/promotions";
import { uploadFileToR2 } from "@/lib/r2-storage";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";

export type CheckoutResult = {
  type: "success" | "error";
  message: string;
  orderNumber?: string;
  orderId?: string;
  paymentMethod?: string;
  pixPayment?: {
    payload: string;
    copiaECola: string;
    emv: string;
    qrCodeDataUrl: string;
    qrCodeBase64: string;
  };
  gatewayPayment?: {
    status: string;
    message: string;
    providerPaymentId?: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    pixTicketUrl?: string;
    checkoutUrl?: string;
  };
};

export type PaymentStatusResult = {
  type: "pending" | "approved" | "error";
  message: string;
};

export async function createCardCheckoutOrderAction(
  storeSlug: string,
  formData: FormData,
) {
  return createCheckoutOrderAction(storeSlug, formData);
}

export async function checkGatewayPaymentStatusAction(
  storeSlug: string,
  orderNumber: string,
): Promise<PaymentStatusResult> {
  const store = await prisma.store.findUnique({
    where: { subdomain: storeSlug },
    select: { id: true },
  });

  if (!store) {
    return { type: "error", message: "Loja não encontrada." };
  }

  const customer = await getCurrentCustomer(store.id);

  if (!customer) {
    return { type: "error", message: "Faça login para consultar o pagamento." };
  }

  const order = await prisma.order.findFirst({
    where: {
      storeId: store.id,
      customerId: customer.id,
      number: orderNumber,
    },
    select: {
      id: true,
      paymentMethod: true,
      paymentStatus: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return { type: "error", message: "Pedido não encontrado." };
  }

  if (order.paymentStatus === "pago") {
    return { type: "approved", message: "Pagamento confirmado." };
  }

  const integrationStatus = normalizeJsonObject(order.integrationStatus);
  const gatewayPayment = normalizeGatewayPayment(integrationStatus.gatewayPayment);

  if (!gatewayPayment.providerPaymentId) {
    return { type: "pending", message: "Pagamento ainda aguardando confirmação." };
  }

  const gatewayId = getGatewayIdFromPaymentMethod(order.paymentMethod);

  if (!gatewayId) {
    return { type: "pending", message: "Pagamento ainda aguardando confirmação." };
  }

  const setting = await prisma.storeAdvancedSetting.findFirst({
    where: {
      storeId: store.id,
      featureId: `payment:${gatewayId}`,
      active: true,
    },
    select: { values: true },
  });

  if (!setting) {
    return { type: "error", message: "Configuração do gateway do pedido não encontrada." };
  }

  const gatewayStatus = await checkGatewayPaymentStatus({
    gatewayId,
    providerPaymentId: gatewayPayment.providerPaymentId,
    orderId: order.id,
    credentials: normalizeCredentialValues(setting.values),
  });

  if (gatewayStatus.status === "failed") {
    return { type: "error", message: gatewayStatus.message };
  }

  if (gatewayStatus.status !== "approved") {
    return { type: "pending", message: gatewayStatus.message };
  }

  const result = await confirmOrderPayment(order.id, store.id, gatewayId);

  if (!result.ok) {
    return { type: "error", message: result.message };
  }

  revalidatePath(`/store/${storeSlug}/pedidos`);
  return { type: "approved", message: "Pagamento confirmado com sucesso." };
}

type CheckoutItem = {
  productId: string;
  quantity: number;
};

export async function createCheckoutOrderAction(
  storeSlug: string,
  formData: FormData,
): Promise<CheckoutResult> {
  const store = await prisma.store.findUnique({
    where: { subdomain: storeSlug },
    select: { id: true, subdomain: true, active: true },
  });

  if (!store || !store.active) {
    return result("error", "Loja não encontrada ou indisponível.");
  }
  const orderLimit = await canCreateOrder(store.id);
  if (!orderLimit.allowed) {
    return result("error", orderLimit.reason ?? "Esta loja atingiu o limite de pedidos do plano.");
  }
  await expirePendingOrders(store.id);

  const sessionCustomer = await getCurrentCustomer(store.id);

  if (!sessionCustomer) {
    return result("error", "Faça login para finalizar a compra.");
  }

  const items = parseItems(getValue(formData, "items"));

  if (items.length === 0) {
    return result("error", "Adicione pelo menos um produto ao pedido.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: sessionCustomer.id,
      storeId: store.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      document: true,
      personType: true,
    },
  });

  if (!customer) {
    return result("error", "Cadastro de comprador não encontrado nesta loja.");
  }

  const deliveryData = {
    zipCode: getValue(formData, "zipCode"),
    street: getValue(formData, "street"),
    number: getValue(formData, "number"),
    complement: getValue(formData, "complement"),
    neighborhood: getValue(formData, "neighborhood"),
    city: getValue(formData, "city"),
    state: getValue(formData, "state"),
  };

  if (!deliveryData.zipCode || !deliveryData.street || !deliveryData.number) {
    return result("error", "Informe o endereço de entrega completo.");
  }

  const paymentMethod = getValue(formData, "paymentMethod");
  const settings = await getStoreAdvancedSettings(store.id);
  const fixedFreightSettings = await prisma.storeAdvancedSetting.findMany({
    where: {
      storeId: store.id,
      featureId: { contains: ":fixed-freight" },
    },
    select: {
      featureId: true,
      values: true,
    },
  });
  const paymentChoice = parsePaymentChoice(paymentMethod);
  const paymentSetting = settings[`payment:${paymentChoice.baseId}`] ?? getDefaultPaymentSetting(paymentChoice.baseId);

  if (!paymentMethod || !paymentSetting?.active) {
    return result("error", "Selecione uma forma de pagamento ativa para esta loja.");
  }

  if (paymentChoice.kind !== "manual" && !isGatewayMethodEnabled(paymentSetting.values, paymentChoice.kind)) {
    return result("error", "Esta opção de pagamento não está ativa para esta loja.");
  }

  const availableFor = paymentSetting.values.availableFor;
  const allowedPersonTypes = Array.isArray(availableFor)
    ? availableFor
    : typeof availableFor === "string"
      ? [availableFor]
      : [];
  const requestedPersonTypeLabel =
    customer.personType === "JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física";

  if (allowedPersonTypes.length > 0 && !allowedPersonTypes.includes(requestedPersonTypeLabel)) {
    return result("error", "A forma de pagamento escolhida não está disponível para este tipo de cadastro.");
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      id: { in: items.map((item) => item.productId) },
      status: "ACTIVE",
      showOnSite: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      categoryId: true,
      stock: true,
      allowOutOfStock: true,
      minQuantity: true,
      freightType: true,
      additionalFreight: true,
    },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      return result("error", "Um produto do carrinho não está disponível nesta loja.");
    }

    if (item.quantity < product.minQuantity) {
      return result("error", `${product.name} exige quantidade mínima de ${product.minQuantity}.`);
    }

    if (!product.allowOutOfStock && product.stock < item.quantity) {
      return result("error", `${product.name} possui apenas ${product.stock} unidade(s) em estoque.`);
    }
  }

  const orderItems = items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error("Produto inválido.");
    }

    const unitPrice = Number(product.price);
    const total = unitPrice * item.quantity;

    return { product, quantity: item.quantity, unitPrice, total };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const promotionResult = await calculatePromotionsForCheckout({
    storeId: store.id,
    customerPersonType: customer.personType,
    subtotal,
    couponCode: getValue(formData, "couponCode"),
    items: orderItems.map((item) => ({
      productId: item.product.id,
      categoryId: item.product.categoryId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
  });

  if (promotionResult.couponError) {
    return result("error", promotionResult.couponError);
  }

  const shippingQuote = calculateServerShipping({
    items: orderItems.map((item) => ({ product: item.product })),
    state: deliveryData.state,
    settings: fixedFreightSettings,
  });

  if (shippingQuote.type === "error") {
    return result("error", shippingQuote.message);
  }

  const shippingFee = shippingQuote.fee;
  const paymentAdditionalPercent = parseMoney(getPaymentValue(paymentSetting.values.additionalPercent));
  const paymentAdditionalValue = parseMoney(getPaymentValue(paymentSetting.values.additionalValue));
  const paymentFee = subtotal * (paymentAdditionalPercent / 100) + paymentAdditionalValue;
  const discount = promotionResult.discount;
  const total = Math.max(subtotal + shippingFee + paymentFee - discount, 0);
  const checkoutFingerprint = buildCheckoutFingerprint({
    customerId: customer.id,
    items: orderItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    paymentMethod,
    shippingZipCode: deliveryData.zipCode,
    total,
  });
  const existingPendingOrder = await findReusablePendingOrder({
    storeId: store.id,
    customerId: customer.id,
    checkoutFingerprint,
  });

  if (existingPendingOrder) {
    const integrationStatus = normalizeJsonObject(existingPendingOrder.integrationStatus);
    const existingPixPayment = normalizePixPayment(integrationStatus.pixPayment);
    const existingGatewayPayment = normalizeGatewayPayment(integrationStatus.gatewayPayment);
    const hasReusableGatewayPayment =
      paymentChoice.kind === "manual" ||
      Boolean(existingGatewayPayment.providerPaymentId && (
        paymentChoice.kind !== "api-pix" ||
        existingGatewayPayment.pixQrCode ||
        existingGatewayPayment.pixQrCodeBase64
      ));

    if (!hasReusableGatewayPayment) {
      await prisma.order.deleteMany({
        where: {
          id: existingPendingOrder.id,
          storeId: store.id,
          customerId: customer.id,
          paymentStatus: { in: ["pendente", "processando", "falhou"] },
        },
      });
    } else {

      return result(
        "success",
        `Pedido ${existingPendingOrder.number} recuperado. Continue o pagamento.`,
        existingPendingOrder.number,
        existingPendingOrder.id,
        existingPendingOrder.paymentMethod ?? paymentMethod,
        existingPixPayment,
        existingGatewayPayment.providerPaymentId || existingGatewayPayment.pixQrCode
          ? existingGatewayPayment
          : undefined,
      );
    }
  }

  const orderNumber = await nextOrderNumber(store.id);
  const pixPayment = paymentMethod === "pix-deposito"
    ? await buildPixPayment(paymentSetting.values, total, orderNumber)
    : null;

  let createdOrderId = "";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.customer.updateMany({
        where: {
          id: customer.id,
          storeId: store.id,
        },
        data: {
          zipCode: deliveryData.zipCode || null,
          street: deliveryData.street || null,
          number: deliveryData.number || null,
          complement: deliveryData.complement || null,
          neighborhood: deliveryData.neighborhood || null,
          city: deliveryData.city || null,
          state: deliveryData.state || null,
        },
      });

      const createdOrder = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          number: orderNumber,
          status: OrderStatus.PENDING,
          subtotal,
          shippingFee,
          discount,
          total,
          paymentMethod,
          paymentStatus: "pendente",
          integrationStatus: {
            checkoutFingerprint,
            paymentExpiresAt: getPaymentExpiresAt(new Date()).toISOString(),
            paymentVisibility: paymentChoice.kind === "manual" ? "customer-only" : "gateway-pending",
            promotions: promotionResult.appliedPromotions,
            ...(pixPayment ? { pixPayment } : {}),
          },
          shippingMethod: shippingQuote.label,
          shippingZipCode: deliveryData.zipCode || null,
          shippingStreet: deliveryData.street || null,
          shippingNumber: deliveryData.number || null,
          shippingComplement: deliveryData.complement || null,
          shippingNeighborhood: deliveryData.neighborhood || null,
          shippingCity: deliveryData.city || null,
          shippingState: deliveryData.state || null,
          recipientName: customer.name,
          notes: getValue(formData, "notes") || null,
          items: {
            create: orderItems.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        select: {
          id: true,
        },
      });
      createdOrderId = createdOrder.id;
      await incrementCouponUsage(
        promotionResult.appliedPromotions
          .map((promotion) => promotion.couponId)
          .filter((couponId): couponId is string => Boolean(couponId)),
      );

    });
  } catch (error) {
    console.error(error);
    return result(
      "error",
      process.env.NODE_ENV === "production"
        ? "Não foi possível finalizar o pedido."
        : `Não foi possível finalizar o pedido: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    );
  }

  const gatewayPayment = paymentChoice.kind !== "manual"
    ? await createGatewayPayment({
        gatewayId: paymentChoice.baseId,
        kind: paymentChoice.kind,
        orderId: createdOrderId,
        orderNumber,
        amount: total,
        description: `Pedido ${orderNumber}`,
        payer: {
          name: customer.name,
          email: customer.email,
          document: customer.document,
        },
        credentials: paymentSetting.values,
        storeSlug: store.subdomain,
        card: paymentChoice.kind === "api-card"
          ? {
              token: getValue(formData, "cardToken"),
              installments: 1,
              payerDocument: getValue(formData, "payerDocument"),
              paymentMethodId: getValue(formData, "paymentMethodId"),
              paymentTypeId: getValue(formData, "cardPaymentType"),
            }
          : undefined,
      })
    : null;

  if (gatewayPayment) {
    await prisma.order.updateMany({
      where: {
        id: createdOrderId,
        storeId: store.id,
      },
      data: {
        paymentStatus: gatewayPayment.status === "failed" ? "falhou" : "pendente",
        integrationStatus: {
          checkoutFingerprint,
          paymentExpiresAt: getPaymentExpiresAt(new Date()).toISOString(),
          paymentVisibility: "gateway-pending",
          promotions: promotionResult.appliedPromotions,
          gatewayPayment,
        },
      },
    });

    if (gatewayPayment.status === "failed") {
      await prisma.order.deleteMany({
        where: {
          id: createdOrderId,
          storeId: store.id,
          paymentStatus: "falhou",
        },
      });

      return result(
        "error",
        gatewayPayment.message,
        orderNumber,
        createdOrderId,
        paymentMethod,
        undefined,
        gatewayPayment,
      );
    }

    if (gatewayPayment.status === "approved") {
      await confirmOrderPayment(createdOrderId, store.id, "mercado-pago");
    }
  }

  revalidatePath(`/store/${store.subdomain}`);
  revalidatePath(`/store/${store.subdomain}/pedidos`);

  return result(
    "success",
    `Pedido ${orderNumber} criado com sucesso.`,
    orderNumber,
    createdOrderId,
    paymentMethod,
    pixPayment ?? undefined,
    gatewayPayment ?? undefined,
  );
}

export async function submitPaymentProofAction(
  storeSlug: string,
  formData: FormData,
): Promise<CheckoutResult> {
  const store = await prisma.store.findUnique({
    where: { subdomain: storeSlug },
    select: { id: true, subdomain: true, active: true },
  });

  if (!store?.active) {
    return result("error", "Loja não encontrada ou indisponível.");
  }
  await expirePendingOrders(store.id);

  const customer = await getCurrentCustomer(store.id);

  if (!customer) {
    return result("error", "Faça login para confirmar o pagamento.");
  }

  const orderId = getValue(formData, "orderId");
  const payerName = getValue(formData, "payerName");
  const payerDocument = getValue(formData, "payerDocument").replace(/\D/g, "");
  const receiptUrl = getValue(formData, "receiptUrl");
  const receiptFile = formData.get("receiptFile");

  if (!payerName || !payerDocument) {
    return result("error", "Informe nome e CPF/CNPJ de quem pagou.");
  }

  const receiptAttachment = await normalizeReceiptAttachment(receiptFile, receiptUrl);

  if (!receiptAttachment) {
    return result("error", "Anexe o comprovante de pagamento.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: store.id,
      customerId: customer.id,
      paymentMethod: "pix-deposito",
    },
    select: {
      id: true,
      createdAt: true,
      paymentStatus: true,
      status: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado para esta loja.");
  }

  if (order.paymentStatus === "cancelado" || order.status === OrderStatus.CANCELED || isPaymentExpired(order.createdAt)) {
    await prisma.order.updateMany({
      where: {
        id: order.id,
        storeId: store.id,
        customerId: customer.id,
      },
      data: {
        status: OrderStatus.CANCELED,
        paymentStatus: "cancelado",
        integrationStatus: {
          ...normalizeJsonObject(order.integrationStatus),
          paymentExpiredAt: new Date().toISOString(),
        },
      },
    });

    return result("error", "Este pedido expirou e não pode mais receber comprovante.");
  }

  await prisma.order.updateMany({
    where: {
      id: order.id,
      storeId: store.id,
      customerId: customer.id,
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

  revalidatePath(`/store/${store.subdomain}/pedidos`);
  revalidatePath("/dashboard/pedidos");
  return result("success", "Comprovante enviado. Aguarde a confirmação da loja.");
}

async function normalizeReceiptAttachment(file: FormDataEntryValue | null, fallbackUrl: string) {
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

  return fallbackUrl;
}

function parseItems(payload: string): CheckoutItem[] {
  try {
    const items = JSON.parse(payload) as Array<{
      productId?: unknown;
      quantity?: unknown;
    }>;

    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => ({
        productId: typeof item.productId === "string" ? item.productId : "",
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0);
  } catch {
    return [];
  }
}

function getDefaultPaymentSetting(paymentMethod: string) {
  if (paymentMethod === "pix-deposito") {
    return null;
  }

  if (paymentMethod !== "customizado") {
    return null;
  }

  return {
    active: true,
    values: {
      title: "Pagamento em mãos",
      checkoutDescription:
        "Finalize o pedido agora e combine o pagamento diretamente com a loja.",
      availableFor: ["Pessoa Física", "Pessoa Jurídica"],
    },
  };
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function normalizePixPayment(value: unknown): CheckoutResult["pixPayment"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const pixPayment = value as CheckoutResult["pixPayment"];

  return pixPayment?.payload && pixPayment.qrCodeDataUrl ? pixPayment : undefined;
}

function normalizeGatewayPayment(value: unknown): NonNullable<CheckoutResult["gatewayPayment"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { status: "pending", message: "" };
  }

  const data = value as Record<string, unknown>;
  return {
    status: typeof data.status === "string" ? data.status : "pending",
    message: typeof data.message === "string" ? data.message : "",
    providerPaymentId: typeof data.providerPaymentId === "string" ? data.providerPaymentId : undefined,
    pixQrCode: typeof data.pixQrCode === "string" ? data.pixQrCode : undefined,
    pixQrCodeBase64: typeof data.pixQrCodeBase64 === "string" ? data.pixQrCodeBase64 : undefined,
    pixTicketUrl: typeof data.pixTicketUrl === "string" ? data.pixTicketUrl : undefined,
    checkoutUrl: typeof data.checkoutUrl === "string" ? data.checkoutUrl : undefined,
  };
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

function getGatewayIdFromPaymentMethod(paymentMethod: string | null) {
  if (!paymentMethod?.includes(":")) {
    return "";
  }

  return paymentMethod.split(":")[0] ?? "";
}

function getPaymentValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePaymentChoice(paymentMethod: string) {
  const [baseId, method] = paymentMethod.split(":");

  if (method === "pix") {
    return { baseId, kind: "api-pix" as const };
  }

  if (method === "card") {
    return { baseId, kind: "api-card" as const };
  }

  return { baseId: paymentMethod, kind: "manual" as const };
}

function isGatewayMethodEnabled(
  values: Record<string, string | string[]>,
  kind: "api-pix" | "api-card",
) {
  const enabledMethods = Array.isArray(values.enabledMethods)
    ? values.enabledMethods
    : values.enabledMethods
      ? [values.enabledMethods]
      : [];

  if (kind === "api-pix") {
    return enabledMethods.includes("pix");
  }

  return enabledMethods.includes("credit") || enabledMethods.includes("debit");
}

function calculateServerShipping({
  items,
  state,
  settings,
}: {
  items: Array<{
    product: {
      id: string;
      freightType: string | null;
      additionalFreight: unknown;
    };
  }>;
  state: string;
  settings: Array<{ featureId: string; values: unknown }>;
}) {
  const normalizedState = state.trim().toUpperCase();

  if (!normalizedState) {
    return {
      type: "error" as const,
      fee: 0,
      label: "Entrega padrão",
      message: "Informe o estado de entrega para calcular o frete.",
    };
  }

  if (items.every(({ product }) => product.freightType === "gratis")) {
    return {
      type: "free" as const,
      fee: 0,
      label: "Frete grátis",
      message: "Frete grátis para este pedido.",
    };
  }

  let fee = 0;
  let minDays = 0;
  let maxDays = 0;

  for (const { product } of items) {
    if (product.freightType === "gratis") {
      continue;
    }

    if (product.freightType !== "fixo") {
      return {
        type: "error" as const,
        fee: 0,
        label: "Entrega indisponível",
        message: "Frete não disponível para sua região.",
      };
    }

    const rule = getFixedFreightRule(product.id, normalizedState, settings);

    if (!rule) {
      return {
        type: "error" as const,
        fee: 0,
        label: "Entrega indisponível",
        message: "Frete não disponível para sua região.",
      };
    }

    fee += rule.value;
    minDays = minDays === 0 ? rule.minDays : Math.min(minDays, rule.minDays);
    maxDays = Math.max(maxDays, rule.maxDays);
  }

  return {
    type: "success" as const,
    fee,
    label: `Frete fixo - ${minDays} a ${maxDays} dias`,
    message: "Frete calculado.",
  };
}

function getFixedFreightRule(
  productId: string,
  state: string,
  settings: Array<{ featureId: string; values: unknown }>,
) {
  const setting = settings.find((item) => item.featureId === `product:${productId}:fixed-freight`);
  const values = setting?.values;
  const rules = values && typeof values === "object" && "rules" in values
    ? (values as { rules?: unknown }).rules
    : null;

  if (!Array.isArray(rules)) {
    return null;
  }

  for (const rule of rules) {
    if (!rule || typeof rule !== "object") {
      continue;
    }

    const data = rule as Record<string, unknown>;

    if (String(data.state ?? "").toUpperCase() === state) {
      return {
        value: Number(data.value ?? 0),
        minDays: Number(data.minDays ?? 0),
        maxDays: Number(data.maxDays ?? 0),
      };
    }
  }

  return null;
}

async function buildPixPayment(
  values: Record<string, string | string[]>,
  total: number,
  orderNumber: string,
) {
  const pixKey = getPaymentValue(values.pixKey);

  if (!pixKey) {
    throw new Error("Chave PIX não configurada.");
  }

  return createPixPayment({
    pixKeyType: getPaymentValue(values.pixKeyType),
    pixKey,
    merchantName: getPaymentValue(values.beneficiaryName) || "LOJA VENDORA",
    merchantCity: getPaymentValue(values.merchantCity) || "SAO PAULO",
    amount: total,
    transactionId: orderNumber.replace(/\D/g, "").slice(0, 25) || "VENDORA",
    description: `Pedido ${orderNumber}`,
  });
}

function buildCheckoutFingerprint(input: {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: string;
  shippingZipCode: string;
  total: number;
}) {
  return JSON.stringify({
    customerId: input.customerId,
    items: [...input.items].sort((first, second) => first.productId.localeCompare(second.productId)),
    paymentMethod: input.paymentMethod,
    shippingZipCode: input.shippingZipCode,
    total: input.total.toFixed(2),
  });
}

async function findReusablePendingOrder(input: {
  storeId: string;
  customerId: string;
  checkoutFingerprint: string;
}) {
  const candidates = await prisma.order.findMany({
    where: {
      storeId: input.storeId,
      customerId: input.customerId,
      status: OrderStatus.PENDING,
      paymentStatus: { in: ["pendente", "processando"] },
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      number: true,
      paymentMethod: true,
      integrationStatus: true,
    },
  });

  return candidates.find((order) => {
    const integrationStatus = normalizeJsonObject(order.integrationStatus);
    return integrationStatus.checkoutFingerprint === input.checkoutFingerprint;
  }) ?? null;
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseMoney(value: string) {
  if (!value) {
    return 0;
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function nextOrderNumber(storeId: string) {
  const lastOrders = await prisma.order.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { number: true },
  });
  const lastNumber = lastOrders.reduce((highest, order) => {
    const current = Number(order.number.replace(/\D/g, ""));
    return Number.isFinite(current) ? Math.max(highest, current) : highest;
  }, 0);

  return `#${String(lastNumber + 1).padStart(6, "0")}`;
}

function result(
  type: CheckoutResult["type"],
  message: string,
  orderNumber?: string,
  orderId?: string,
  paymentMethod?: string,
  pixPayment?: CheckoutResult["pixPayment"],
  gatewayPayment?: CheckoutResult["gatewayPayment"],
): CheckoutResult {
  return { type, message, orderNumber, orderId, paymentMethod, pixPayment, gatewayPayment };
}
