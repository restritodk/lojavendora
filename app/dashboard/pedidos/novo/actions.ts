"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { syncOrderIntegrationsForStore } from "@/lib/integrations/order-hooks";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";
import {
  createStoreNotification,
  shouldNotifyOrderAbove,
} from "@/lib/store-notifications";

export type CreateManualOrderResult = {
  type: "success" | "error";
  message: string;
  orderNumber?: string;
};

export async function createManualOrderAction(
  formData: FormData,
): Promise<CreateManualOrderResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const customerId = getValue(formData, "customerId");
  const itemsPayload = getValue(formData, "items");

  if (!customerId) {
    return result("error", "Selecione um cliente para o pedido.");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId: store.id },
    select: { id: true, name: true },
  });

  if (!customer) {
    return result("error", "Cliente não encontrado.");
  }

  const parsedItems = parseItems(itemsPayload);

  if (parsedItems.length === 0) {
    return result("error", "Adicione pelo menos um produto ao pedido.");
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      id: { in: parsedItems.map((item) => item.productId) },
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      allowOutOfStock: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of parsedItems) {
    const product = productMap.get(item.productId);

    if (!product) {
      return result("error", "Um dos produtos selecionados não foi encontrado.");
    }

    if (!product.allowOutOfStock && product.stock < item.quantity) {
      return result(
        "error",
        `O produto ${product.name} possui apenas ${product.stock} unidade(s) em estoque.`,
      );
    }
  }

  const orderItems = parsedItems.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error("Produto inválido.");
    }

    const unitPrice = Number(product.price);
    const total = unitPrice * item.quantity;

    return {
      product,
      quantity: item.quantity,
      unitPrice,
      total,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const shippingFee = parseMoney(getValue(formData, "shippingFee"));
  const discount = parseMoney(getValue(formData, "discount"));
  const total = Math.max(subtotal + shippingFee - discount, 0);
  const orderNumber = await nextOrderNumber(store.id);
  const status = parseOrderStatus(getValue(formData, "status"));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          number: orderNumber,
          status,
          subtotal,
          shippingFee,
          discount,
          total,
          paymentMethod: getValue(formData, "paymentMethod") || null,
          paymentStatus: getValue(formData, "paymentStatus") || null,
          shippingMethod: getValue(formData, "shippingMethod") || null,
          shippingZipCode: getValue(formData, "shippingZipCode") || null,
          shippingStreet: getValue(formData, "shippingStreet") || null,
          shippingNumber: getValue(formData, "shippingNumber") || null,
          shippingComplement: getValue(formData, "shippingComplement") || null,
          shippingNeighborhood: getValue(formData, "shippingNeighborhood") || null,
          shippingCity: getValue(formData, "shippingCity") || null,
          shippingState: getValue(formData, "shippingState") || null,
          trackingCode: getValue(formData, "trackingCode") || null,
          shippingDeadline: getValue(formData, "shippingDeadline") || null,
          recipientName: getValue(formData, "recipientName") || customer.name,
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
      });

      await Promise.all(
        orderItems
          .filter((item) => !item.product.allowOutOfStock)
          .map((item) =>
            tx.product.updateMany({
              where: {
                id: item.product.id,
                storeId: store.id,
                stock: { gte: item.quantity },
              },
              data: { stock: { decrement: item.quantity } },
            }),
          ),
      );
    });
  } catch (error) {
    console.error(error);
    return result("error", "Não foi possível criar o pedido.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/produtos");

  const settings = await getStoreAdvancedSettings(store.id);
  await syncOrderIntegrationsForStore(store.id, settings);
  await createCriticalStockNotifications(store.id, orderItems);

  if (await shouldNotifyOrderAbove(store.id, total)) {
    await createStoreNotification({
      storeId: store.id,
      type: "order-above",
      title: "Pedido efetuado acima do valor configurado",
      message: `Pedido ${orderNumber} foi criado no valor de ${formatCurrency(total)}.`,
      icon: "💰",
      href: "/dashboard/pedidos",
      eventKey: `order-above:${orderNumber}`,
    });
  }

  return result("success", `Pedido ${orderNumber} criado com sucesso.`, orderNumber);
}

function result(
  type: CreateManualOrderResult["type"],
  message: string,
  orderNumber?: string,
): CreateManualOrderResult {
  return { type, message, orderNumber };
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseItems(payload: string) {
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
  const count = await prisma.order.count({ where: { storeId } });
  return `#${String(count + 1).padStart(6, "0")}`;
}

function parseOrderStatus(value: string): OrderStatus {
  if (value in OrderStatus) {
    return OrderStatus[value as keyof typeof OrderStatus];
  }

  return OrderStatus.PENDING;
}

async function createCriticalStockNotifications(
  storeId: string,
  orderItems: Array<{
    product: { id: string; name: string; stock: number; criticalStock?: number };
    quantity: number;
  }>,
) {
  for (const item of orderItems) {
    const product = await prisma.product.findFirst({
      where: {
        id: item.product.id,
        storeId,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        criticalStock: true,
      },
    });

    if (!product || product.stock > product.criticalStock) {
      continue;
    }

    await createStoreNotification({
      storeId,
      type: "critical-stock",
      title: "Estoque crítico",
      message: `${product.name} chegou a ${product.stock} unidade(s) em estoque.`,
      icon: "📦",
      href: "/dashboard/produtos",
      eventKey: `critical-stock:${product.id}:${product.stock}`,
    });
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
