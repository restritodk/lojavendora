"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { syncOrderIntegrationsForStore } from "@/lib/integrations/order-hooks";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";
import { createStoreNotification } from "@/lib/store-notifications";

export type EditOrderResult = {
  type: "success" | "error";
  message: string;
};

type EditableStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

export async function updateOrderDetailsAction(
  orderId: string,
  formData: FormData,
): Promise<EditOrderResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: { id: true, status: true },
  });

  if (!order) {
    return result("error", "Pedido não encontrado.");
  }

  const nextStatus = parseStatus(getValue(formData, "status"));
  const transitionError = validateStatusChange(order.status, nextStatus);

  if (transitionError) {
    return result("error", transitionError);
  }

  await prisma.order.updateMany({
    where: {
      id: order.id,
      storeId: store.id,
    },
    data: {
      status: nextStatus,
      paymentStatus: normalizeNullable(getValue(formData, "paymentStatus")),
      paymentMethod: normalizeNullable(getValue(formData, "paymentMethod")),
      shippingMethod: normalizeNullable(getValue(formData, "shippingMethod")),
      trackingCode: normalizeNullable(getValue(formData, "trackingCode")),
      shippingDeadline: normalizeNullable(getValue(formData, "shippingDeadline")),
      notes: normalizeNullable(getValue(formData, "notes")),
      ...(nextStatus === OrderStatus.PAID ? { paymentStatus: "pago" } : {}),
      ...(nextStatus === OrderStatus.PROCESSING ? { paymentStatus: "processando" } : {}),
      ...(nextStatus === OrderStatus.CANCELED ? { paymentStatus: "cancelado" } : {}),
    },
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/dashboard/pedidos/${order.id}/editar`);
  revalidatePath("/store/[slug]/pedidos", "page");

  const settings = await getStoreAdvancedSettings(store.id);
  await syncOrderIntegrationsForStore(store.id, settings);
  await maybeCreateStatusNotification(store.id, order.id, nextStatus);

  return result("success", "Pedido atualizado com sucesso.");
}

function result(type: EditOrderResult["type"], message: string): EditOrderResult {
  return { type, message };
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullable(value: string) {
  return value ? value : null;
}

function parseStatus(value: string): OrderStatus {
  if (isEditableStatus(value)) {
    return OrderStatus[value];
  }

  return OrderStatus.PENDING;
}

function isEditableStatus(value: string): value is EditableStatus {
  return [
    "PENDING",
    "PROCESSING",
    "PAID",
    "SHIPPED",
    "DELIVERED",
    "CANCELED",
  ].includes(value);
}

function validateStatusChange(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (nextStatus === currentStatus) {
    return null;
  }

  if (nextStatus === OrderStatus.SHIPPED && currentStatus !== OrderStatus.PAID) {
    return "Confirme o pagamento antes de marcar o pedido como enviado.";
  }

  if (nextStatus === OrderStatus.DELIVERED && currentStatus !== OrderStatus.SHIPPED) {
    return "Somente pedidos em trânsito podem ser marcados como entregues.";
  }

  if (currentStatus === OrderStatus.DELIVERED && nextStatus !== OrderStatus.DELIVERED) {
    return "Pedidos entregues não podem voltar para uma etapa anterior.";
  }

  return null;
}

async function maybeCreateStatusNotification(
  storeId: string,
  orderId: string,
  status: OrderStatus,
) {
  if (status !== OrderStatus.PAID && status !== OrderStatus.DELIVERED) {
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
    type: status === OrderStatus.PAID ? "payment-approved" : "order-delivered",
    title: status === OrderStatus.PAID ? "Pagamento aprovado" : "Pedido entregue",
    message:
      status === OrderStatus.PAID
        ? `O pagamento do pedido ${order.number} foi confirmado.`
        : `O pedido ${order.number} foi entregue ao cliente.`,
    icon: status === OrderStatus.PAID ? "✅" : "🏆",
    href: "/dashboard/pedidos",
    eventKey: `${status}:${orderId}`,
  });
}
