import "server-only";
import { prisma } from "@/lib/prisma";
import { createIntegrationLog, getStoreIntegrationContext } from "./settings";

export async function syncMarketingIntegration(storeId: string, appId: string) {
  const context = await getActiveContext(storeId, appId);
  if (!context) return skipped(storeId, appId, "marketing-sync");

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: {
        storeId,
        allowPromotions: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      take: 500,
    }),
    prisma.product.findMany({
      where: {
        storeId,
        status: "ACTIVE",
        showOnSite: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        stock: true,
      },
      take: 1000,
    }),
  ]);

  await createIntegrationLog({
    storeId,
    appId,
    action: "marketing-sync",
    status: "success",
    message: `${customers.length} cliente(s) e ${products.length} produto(s) prontos para marketing.`,
    metadata: {
      customers: customers.length,
      products: products.length,
      mode: context.appId,
    },
  });
}

export async function syncServiceIntegration(storeId: string, appId: string) {
  const context = await getActiveContext(storeId, appId);
  if (!context) return skipped(storeId, appId, "service-sync");

  const [customers, orders] = await Promise.all([
    prisma.customer.count({ where: { storeId } }),
    prisma.order.count({ where: { storeId } }),
  ]);

  await createIntegrationLog({
    storeId,
    appId,
    action: "service-sync",
    status: "success",
    message: `${customers} cliente(s) e ${orders} pedido(s) disponíveis para atendimento/avaliações.`,
    metadata: { customers, orders },
  });
}

export async function syncLogisticsIntegration(storeId: string, appId: string) {
  const context = await getActiveContext(storeId, appId);
  if (!context) return skipped(storeId, appId, "logistics-sync");

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: ["PAID", "PROCESSING", "SHIPPED"] },
    },
    select: {
      id: true,
      number: true,
      total: true,
      shippingZipCode: true,
      shippingCity: true,
      shippingState: true,
      items: {
        select: {
          quantity: true,
          product: {
            select: {
              weight: true,
              height: true,
              width: true,
              length: true,
            },
          },
        },
      },
    },
    take: 200,
  });

  await createIntegrationLog({
    storeId,
    appId,
    action: "logistics-sync",
    status: "success",
    message: `${orders.length} pedido(s) preparados para logística/ERP/fiscal.`,
    metadata: { orders: orders.length },
  });

  await markOrdersIntegrationStatus(
    storeId,
    appId,
    orders.map((order) => order.id),
    "logistics",
  );
}

export async function syncSecurityIntegration(storeId: string, appId: string) {
  const context = await getActiveContext(storeId, appId);
  if (!context) return skipped(storeId, appId, "security-sync");

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: ["PENDING", "PAID", "PROCESSING"] },
    },
    select: {
      id: true,
      number: true,
      total: true,
      paymentMethod: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          document: true,
        },
      },
    },
    take: 200,
  });

  await createIntegrationLog({
    storeId,
    appId,
    action: "security-sync",
    status: "success",
    message: `${orders.length} pedido(s) preparados para análise antifraude.`,
    metadata: { orders: orders.length },
  });

  await markOrdersIntegrationStatus(
    storeId,
    appId,
    orders.map((order) => order.id),
    "security",
  );
}

async function markOrdersIntegrationStatus(
  storeId: string,
  appId: string,
  orderIds: string[],
  statusKey: string,
) {
  for (const orderId of orderIds) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        storeId,
      },
      select: {
        integrationStatus: true,
      },
    });

    if (!order) {
      continue;
    }

    await prisma.order.updateMany({
      where: {
        id: orderId,
        storeId,
      },
      data: {
        integrationStatus: {
          ...(typeof order.integrationStatus === "object" &&
          order.integrationStatus &&
          !Array.isArray(order.integrationStatus)
            ? order.integrationStatus
            : {}),
          [appId]: {
            status: statusKey,
            syncedAt: new Date().toISOString(),
            storeScoped: true,
          },
        },
      },
    });
  }
}

async function getActiveContext(storeId: string, appId: string) {
  const context = await getStoreIntegrationContext(storeId, appId);
  return context?.active ? context : null;
}

async function skipped(storeId: string, appId: string, action: string) {
  await createIntegrationLog({
    storeId,
    appId,
    action,
    status: "skipped",
    message: "Aplicativo desativado ou sem configuração para esta loja.",
  });
}
