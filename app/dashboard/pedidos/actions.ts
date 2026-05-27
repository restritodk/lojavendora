"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { syncOrderIntegrationsForStore } from "@/lib/integrations/order-hooks";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { confirmOrderPayment, expirePendingOrders } from "@/lib/orders/payment-lifecycle";
import { refundGatewayPayment } from "@/lib/payments/gateways";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";
import { createStoreNotification } from "@/lib/store-notifications";

export type OrderListActionResult = {
  type: "success" | "error";
  message: string;
};

type OrderAction = "paid" | "shipped" | "delivered" | "canceled";

export async function updateOrderStatusAction(
  orderId: string,
  action: OrderAction,
): Promise<OrderListActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pedidos");
  await expirePendingOrders(store.id);

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado.");
  }

  if (action === "paid") {
    const paymentError = validatePaymentConfirmation(order.paymentMethod, order.integrationStatus);

    if (paymentError) {
      return result("error", paymentError);
    }

    const paymentResult = await confirmOrderPayment(order.id, store.id, "manual");

    if (!paymentResult.ok) {
      return result("error", paymentResult.message);
    }

    revalidatePath("/dashboard/pedidos");
    revalidatePath("/store/[slug]/pedidos", "page");

    const settings = await getStoreAdvancedSettings(store.id);
    await syncOrderIntegrationsForStore(store.id, settings);
    await maybeCreateOrderNotification(store.id, order.id, action);

    return result("success", paymentResult.message);
  }

  const transitionError = validateTransition(order.status, action);

  if (transitionError) {
    return result("error", transitionError);
  }

  await prisma.order.updateMany({
    where: {
      id: order.id,
      storeId: store.id,
    },
    data: {
      status: action === "shipped"
        ? OrderStatus.SHIPPED
        : action === "delivered"
          ? OrderStatus.DELIVERED
          : OrderStatus.CANCELED,
      ...(action === "canceled" ? { paymentStatus: "cancelado" } : {}),
    },
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");

  const settings = await getStoreAdvancedSettings(store.id);
  await syncOrderIntegrationsForStore(store.id, settings);
  await maybeCreateOrderNotification(store.id, order.id, action);

  return result("success", actionMessage(action));
}

export async function confirmOrderShipmentAction(
  orderId: string,
  formData: FormData,
): Promise<OrderListActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pedidos");

  const shippingMethod = getValue(formData, "shippingMethod");
  const trackingCode = getValue(formData, "trackingCode");

  if (!shippingMethod) {
    return result("error", "Selecione a empresa de transporte.");
  }

  if (!trackingCode) {
    return result("error", "Informe o código de rastreio.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: { id: true, status: true },
  });

  if (!order) {
    return result("error", "Pedido não encontrado.");
  }

  const transitionError = validateTransition(order.status, "shipped");

  if (transitionError) {
    return result("error", transitionError);
  }

  await prisma.order.updateMany({
    where: {
      id: order.id,
      storeId: store.id,
    },
    data: {
      status: OrderStatus.SHIPPED,
      shippingMethod,
      trackingCode,
      shippingDeadline: getValue(formData, "shippingDeadline") || null,
    },
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");

  const settings = await getStoreAdvancedSettings(store.id);
  await syncOrderIntegrationsForStore(store.id, settings);

  return result("success", "Pedido marcado como enviado com rastreio.");
}

export async function generateShippingLabelAction(
  orderId: string,
  formData: FormData,
): Promise<OrderListActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pedidos");

  const carrier = getValue(formData, "carrier");
  const service = getValue(formData, "service");
  const notes = getValue(formData, "notes");

  if (!carrier) {
    return result("error", "Informe a transportadora da etiqueta.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      number: true,
      status: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado.");
  }

  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.SHIPPED) {
    return result("error", "A etiqueta só pode ser gerada após confirmação do pagamento.");
  }

  const labelCode = `ETQ-${order.number.replace(/\D/g, "").padStart(6, "0")}-${Date.now().toString().slice(-6)}`;

  await prisma.order.updateMany({
    where: { id: order.id, storeId: store.id },
    data: {
      integrationStatus: {
        ...normalizeJsonObject(order.integrationStatus),
        shippingLabel: {
          code: labelCode,
          carrier,
          service,
          notes,
          generatedAt: new Date().toISOString(),
        },
      },
    },
  });

  revalidatePath("/dashboard/pedidos");
  return result("success", `Etiqueta ${labelCode} gerada com sucesso.`);
}

export async function confirmOrderDeliveryAction(
  orderId: string,
  formData: FormData,
): Promise<OrderListActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pedidos");

  const deliveredDate = getValue(formData, "deliveredDate");
  const deliveredTime = getValue(formData, "deliveredTime");
  const receivedBy = getValue(formData, "receivedBy");

  if (!deliveredDate || !deliveredTime || !receivedBy) {
    return result("error", "Informe data, hora e quem recebeu o pedido.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      status: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado.");
  }

  if (order.status !== OrderStatus.SHIPPED) {
    return result("error", "Somente pedidos em trânsito podem ter entrega confirmada.");
  }

  await prisma.order.updateMany({
    where: { id: order.id, storeId: store.id },
    data: {
      status: OrderStatus.DELIVERED,
      integrationStatus: {
        ...normalizeJsonObject(order.integrationStatus),
        deliveryConfirmation: {
          deliveredDate,
          deliveredTime,
          receivedBy,
          confirmedAt: new Date().toISOString(),
        },
      },
    },
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");

  const settings = await getStoreAdvancedSettings(store.id);
  await syncOrderIntegrationsForStore(store.id, settings);
  await maybeCreateOrderNotification(store.id, order.id, "delivered");

  return result("success", "Entrega confirmada com sucesso.");
}

export async function approveReturnRequestAction(
  returnRequestId: string,
  formData: FormData,
): Promise<OrderListActionResult> {
  const context = await getMerchantStoreContext();

  if ("type" in context) return context;

  const carrier = getValue(formData, "carrier");
  const postCode = getValue(formData, "postCode");
  const returnAddress = getValue(formData, "returnAddress");
  const deadline = getValue(formData, "deadline");
  const instructions = getValue(formData, "instructions");
  const notes = getValue(formData, "notes");

  if (!returnAddress || !instructions) {
    return result("error", "Informe endereço e instruções para a devolução.");
  }

  const request = await prisma.orderReturnRequest.findFirst({
    where: {
      id: returnRequestId,
      order: { storeId: context.store.id },
    },
    select: { id: true, orderId: true, status: true, order: { select: { status: true } } },
  });

  if (!request || request.status !== "REQUESTED") {
    return result("error", "Solicitação de devolução não encontrada ou já analisada.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderReturnRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        merchantCarrier: carrier || null,
        merchantPostCode: postCode || null,
        merchantReturnAddress: returnAddress,
        merchantPostDeadline: deadline || null,
        merchantPackageInstructions: instructions,
        merchantNotes: notes || null,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: request.orderId,
        actorType: "merchant",
        actorId: context.user.id,
        previousStatus: request.order.status,
        nextStatus: "RETURN_APPROVED",
        note: "Devolução aprovada pelo lojista.",
      },
    });
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");
  return result("success", "Devolução aprovada e instruções enviadas ao comprador.");
}

export async function rejectReturnRequestAction(
  returnRequestId: string,
  formData: FormData,
): Promise<OrderListActionResult> {
  const context = await getMerchantStoreContext();

  if ("type" in context) return context;

  const reason = getValue(formData, "reason");
  const otherReason = getValue(formData, "otherReason");
  const notes = reason === "Outro motivo" ? otherReason : reason;

  if (!notes) {
    return result("error", "Informe o motivo da recusa.");
  }

  const request = await prisma.orderReturnRequest.findFirst({
    where: {
      id: returnRequestId,
      order: { storeId: context.store.id },
    },
    select: { id: true, orderId: true, status: true, order: { select: { status: true } } },
  });

  if (!request || request.status !== "REQUESTED") {
    return result("error", "Solicitação de devolução não encontrada ou já analisada.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderReturnRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        merchantNotes: notes,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: request.orderId,
        actorType: "merchant",
        actorId: context.user.id,
        previousStatus: request.order.status,
        nextStatus: "RETURN_REJECTED",
        note: notes,
      },
    });
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");
  return result("success", "Solicitação de devolução recusada.");
}

export async function receiveReturnedOrderAction(
  returnRequestId: string,
  formData: FormData,
): Promise<OrderListActionResult> {
  const context = await getMerchantStoreContext();

  if ("type" in context) return context;

  const notes = getValue(formData, "notes");
  const request = await prisma.orderReturnRequest.findFirst({
    where: {
      id: returnRequestId,
      order: { storeId: context.store.id },
      status: "SHIPPED_BY_CUSTOMER",
    },
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          status: true,
          integrationStatus: true,
        },
      },
    },
  });

  if (!request) {
    return result("error", "A devolução ainda não foi postada pelo comprador.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderReturnRequest.update({
      where: { id: request.id },
      data: {
        status: "RECEIVED_BY_MERCHANT",
        merchantNotes: notes || null,
      },
    });
    await tx.order.update({
      where: { id: request.orderId },
      data: {
        integrationStatus: {
          ...normalizeJsonObject(request.order.integrationStatus),
          returnReceivedAt: new Date().toISOString(),
          returnReceivedMessage: notes || "Devolução recebida e validada pela loja.",
        },
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: request.orderId,
        actorType: "merchant",
        actorId: context.user.id,
        previousStatus: request.order.status,
        nextStatus: "RETURN_RECEIVED_BY_MERCHANT",
        note: notes || "Devolução recebida e validada pela loja.",
      },
    });
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");
  return result("success", "Devolução recebida. Agora o estorno pode ser solicitado.");
}

export async function refundReturnedOrderAction(returnRequestId: string): Promise<OrderListActionResult> {
  const context = await getMerchantStoreContext();

  if ("type" in context) return context;

  const request = await prisma.orderReturnRequest.findFirst({
    where: {
      id: returnRequestId,
      order: { storeId: context.store.id },
      status: "RECEIVED_BY_MERCHANT",
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          total: true,
          paymentMethod: true,
          integrationStatus: true,
        },
      },
    },
  });

  if (!request) {
    return result("error", "Valide o recebimento da devolução antes de estornar.");
  }

  const refund = await requestMerchantRefund(context.store.id, request.order.paymentMethod, request.order.integrationStatus, Number(request.order.total));

  if (!refund || refund.status === "failed") {
    return result("error", refund?.message ?? "Este pedido não possui pagamento via gateway para estorno automático.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: request.order.id },
      data: {
        status: refund.status === "refunded" ? OrderStatus.REFUNDED : request.order.status,
        paymentStatus: refund.status === "refunded" ? "estornado" : "estorno_solicitado",
        integrationStatus: {
          ...normalizeJsonObject(request.order.integrationStatus),
          returnRefundedAt: new Date().toISOString(),
          returnRefund: refund,
        },
      },
    });
    await tx.orderReturnRequest.update({
      where: { id: request.id },
      data: {
        status: refund.status === "refunded" ? "REFUNDED" : "REFUND_REQUESTED",
        refundStatus: refund.status,
        refundProviderId: refund.providerRefundId,
        refundMessage: refund.message,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: request.order.id,
        actorType: "merchant",
        actorId: context.user.id,
        previousStatus: request.order.status,
        nextStatus: refund.status === "refunded" ? OrderStatus.REFUNDED : "REFUND_REQUESTED",
        note: refund.message,
      },
    });
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/store/[slug]/pedidos", "page");
  return result("success", refund.message);
}

export async function deleteOrderAction(orderId: string): Promise<OrderListActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pedidos");

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      integrationStatus: true,
    },
  });

  if (!order) {
    return result("error", "Pedido não encontrado.");
  }

  if (order.status !== OrderStatus.CANCELED && order.paymentStatus !== "cancelado") {
    return result("error", "Cancele o pedido antes de excluir.");
  }

  await prisma.order.delete({
    where: { id: order.id },
  });

  revalidatePath("/dashboard/pedidos");
  return result("success", "Pedido excluído com sucesso.");
}

function result(
  type: OrderListActionResult["type"],
  message: string,
): OrderListActionResult {
  return { type, message };
}

function actionMessage(action: OrderAction) {
  const messages = {
    paid: "Pagamento confirmado com sucesso.",
    shipped: "Pedido marcado como enviado.",
    delivered: "Pedido concluído com sucesso.",
    canceled: "Pedido cancelado com sucesso.",
  };

  return messages[action];
}

function validateTransition(currentStatus: OrderStatus, action: OrderAction) {
  if (action === "paid" && currentStatus !== OrderStatus.PENDING) {
    return "Somente pedidos aguardando pagamento podem ter pagamento confirmado.";
  }

  if (action === "shipped" && currentStatus !== OrderStatus.PAID) {
    return "Confirme o pagamento antes de marcar o pedido como enviado.";
  }

  if (action === "delivered" && currentStatus !== OrderStatus.SHIPPED) {
    return "Somente pedidos em trânsito podem ser concluídos como entregues.";
  }

  if (action === "canceled" && currentStatus === OrderStatus.DELIVERED) {
    return "Pedidos entregues não podem ser cancelados por essa ação.";
  }

  return null;
}

function validatePaymentConfirmation(paymentMethod: string | null, integrationStatus: unknown) {
  const allowedMethods = new Set(["customizado", "pix-deposito", "dinheiro", "manual"]);

  if (!paymentMethod || !allowedMethods.has(paymentMethod)) {
    return "A confirmação manual só está disponível para pagamento em mãos ou PIX/Depósito.";
  }

  if (paymentMethod === "pix-deposito") {
    const proof = normalizeJsonObject(integrationStatus).paymentProof;

    if (!proof || typeof proof !== "object") {
      return "Aguarde o comprador enviar o comprovante do PIX/Depósito.";
    }
  }

  return null;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getMerchantStoreContext() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pedidos");

  return { user, store };
}

async function requestMerchantRefund(
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

async function maybeCreateOrderNotification(
  storeId: string,
  orderId: string,
  action: OrderAction,
) {
  if (action !== "paid" && action !== "delivered") {
    return;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { number: true },
  });

  if (!order) {
    return;
  }

  await createStoreNotification({
    storeId,
    type: action === "paid" ? "payment-approved" : "order-delivered",
    title: action === "paid" ? "Pagamento aprovado" : "Pedido entregue",
    message:
      action === "paid"
        ? `O pagamento do pedido ${order.number} foi confirmado.`
        : `O pedido ${order.number} foi entregue ao cliente.`,
    icon: action === "paid" ? "✅" : "🏆",
    href: "/dashboard/pedidos",
    eventKey: `${action}:${orderId}`,
  });
}
