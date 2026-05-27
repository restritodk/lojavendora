import { OrderStatus, type PrismaClient } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAYMENT_EXPIRATION_HOURS = 24;
const RETURN_POSTING_EXPIRATION_HOURS = 72;

type DbClient = PrismaClient | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export function getPaymentExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + PAYMENT_EXPIRATION_HOURS * 60 * 60 * 1000);
}

export async function expirePendingOrders(storeId?: string) {
  const now = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      status: OrderStatus.PENDING,
      paymentStatus: { in: ["pendente", "processando"] },
      createdAt: { lt: new Date(now.getTime() - PAYMENT_EXPIRATION_HOURS * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      integrationStatus: true,
    },
  });

  await Promise.all(
    expiredOrders.map((order) =>
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELED,
          paymentStatus: "cancelado",
          integrationStatus: {
            ...normalizeJsonObject(order.integrationStatus),
            paymentExpiredAt: now.toISOString(),
          },
        },
      }),
    ),
  );
}

export function getReturnPostingExpiresAt(approvedAt: Date) {
  return new Date(approvedAt.getTime() + RETURN_POSTING_EXPIRATION_HOURS * 60 * 60 * 1000);
}

export async function expireApprovedReturnRequests(storeId?: string) {
  const now = new Date();
  const expiredRequests = await prisma.orderReturnRequest.findMany({
    where: {
      status: "APPROVED",
      updatedAt: { lt: new Date(now.getTime() - RETURN_POSTING_EXPIRATION_HOURS * 60 * 60 * 1000) },
      order: {
        ...(storeId ? { storeId } : {}),
      },
    },
    select: {
      id: true,
      orderId: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          status: true,
          integrationStatus: true,
        },
      },
    },
  });

  await Promise.all(
    expiredRequests.map((request) =>
      prisma.$transaction(async (tx) => {
        const message = "Prazo para postagem da devolução expirou. O pedido foi concluído como entregue.";

        await tx.orderReturnRequest.update({
          where: { id: request.id },
          data: {
            status: "EXPIRED",
            merchantNotes: message,
          },
        });

        await tx.order.update({
          where: { id: request.orderId },
          data: {
            status: OrderStatus.DELIVERED,
            integrationStatus: {
              ...normalizeJsonObject(request.order.integrationStatus),
              returnPostingExpiredAt: now.toISOString(),
              returnPostingExpiredRequestId: request.id,
            },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: request.orderId,
            actorType: "system",
            previousStatus: request.order.status,
            nextStatus: OrderStatus.DELIVERED,
            note: message,
          },
        });
      }),
    ),
  );
}

export async function confirmOrderPayment(
  orderId: string,
  storeId: string,
  source: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, storeId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return { ok: false as const, message: "Pedido não encontrado." };
    }

    if (order.status === OrderStatus.CANCELED || order.paymentStatus === "cancelado") {
      return { ok: false as const, message: "Pedido cancelado não pode ser pago." };
    }

    if (isPaymentExpired(order.createdAt)) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELED,
          paymentStatus: "cancelado",
          integrationStatus: {
            ...normalizeJsonObject(order.integrationStatus),
            paymentExpiredAt: new Date().toISOString(),
          },
        },
      });

      return { ok: false as const, message: "Pedido expirou e não pode mais ser pago." };
    }

    const integrationStatus = normalizeJsonObject(order.integrationStatus);

    if (!integrationStatus.stockReservedAt) {
      const stockError = await decrementOrderStock(tx, order.items);

      if (stockError) {
        return { ok: false as const, message: stockError };
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: "pago",
        integrationStatus: {
          ...integrationStatus,
          stockReservedAt: integrationStatus.stockReservedAt ?? new Date().toISOString(),
          paymentConfirmedAt: new Date().toISOString(),
          paymentConfirmedBy: source,
        },
      },
    });

    return { ok: true as const, message: "Pagamento confirmado com sucesso." };
  });
}

export function isPaymentExpired(createdAt: Date) {
  return getPaymentExpiresAt(createdAt).getTime() <= Date.now();
}

async function decrementOrderStock(
  tx: DbClient,
  items: Array<{
    quantity: number;
    product: {
      id: string;
      storeId: string;
      stock: number;
      allowOutOfStock: boolean;
      name: string;
    } | null;
  }>,
) {
  for (const item of items) {
    if (!item.product || item.product.allowOutOfStock) {
      continue;
    }

    const updated = await tx.product.updateMany({
      where: {
        id: item.product.id,
        storeId: item.product.storeId,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (updated.count === 0) {
      return `${item.product.name} não possui estoque suficiente para confirmar o pagamento.`;
    }
  }

  return null;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}
