import {
  PlatformInvoiceStatus,
  Prisma,
  SubscriptionStatus,
} from "@/app/generated/prisma/client";
import { getStorePlanUsage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export type PlatformBillingSummary = Awaited<ReturnType<typeof getPlatformBillingSummary>>;

export async function getPlatformBillingSummary(storeId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      storeId,
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
      },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  const planUsage = await getStorePlanUsage(storeId);
  const invoice = subscription ? await ensureCurrentPlatformInvoice(storeId, subscription.id) : null;
  await markOverdueInvoices(storeId);
  const invoices = await prisma.platformInvoice.findMany({
    where: { storeId },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    take: 24,
    include: {
      plan: true,
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return {
    subscription,
    currentInvoice: invoice,
    invoices,
    usage: {
      products: toLegacyUsage(planUsage, "products"),
      users: toLegacyUsage(planUsage, "users"),
      visits: toLegacyUsage(planUsage, "views"),
    },
  };
}

export async function ensureCurrentPlatformInvoice(storeId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      storeId,
    },
    include: { plan: true },
  });

  if (!subscription) {
    return null;
  }

  if (Number(subscription.plan.price) === 0) {
    return null;
  }

  const referenceMonth = getReferenceMonth(new Date());
  const amount = subscription.plan.promotionalPrice ?? subscription.plan.price;

  return prisma.platformInvoice.upsert({
    where: {
      storeId_referenceMonth: {
        storeId,
        referenceMonth,
      },
    },
    update: {
      subscriptionId: subscription.id,
      planId: subscription.planId,
      amount,
    },
    create: {
      storeId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      referenceMonth,
      amount,
      dueDate: getDefaultDueDate(new Date()),
    },
    include: {
      plan: true,
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getOpenPlatformInvoice(storeId: string, invoiceId: string) {
  return prisma.platformInvoice.findFirst({
    where: {
      id: invoiceId,
      storeId,
      status: {
        in: [PlatformInvoiceStatus.OPEN, PlatformInvoiceStatus.OVERDUE],
      },
    },
    include: {
      store: true,
      plan: true,
      subscription: true,
    },
  });
}

export async function markPlatformInvoicePaid({
  invoiceId,
  providerPaymentId,
  method,
  response,
}: {
  invoiceId: string;
  providerPaymentId: string;
  method: "PIX" | "CARD";
  response: Prisma.InputJsonValue;
}) {
  const invoice = await prisma.platformInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });
  const subscription = invoice?.subscription;
  const now = new Date();
  const durationDays = subscription?.plan.durationDays ?? 30;
  const currentPeriodStart = subscription?.currentPeriodEnd && subscription.currentPeriodEnd > now
    ? subscription.currentPeriodEnd
    : now;
  const currentPeriodEnd = new Date(currentPeriodStart);
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + durationDays);

  return prisma.platformInvoice.update({
    where: { id: invoiceId },
    data: {
      status: PlatformInvoiceStatus.PAID,
      paidAt: new Date(),
      provider: "mercado-pago",
      providerPaymentId,
      paymentMethod: method,
      paymentData: response,
      subscription: {
        update: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart,
          currentPeriodEnd,
          autoRenew: true,
          currentUsage: {},
        },
      },
    },
  });
}

export function formatPlatformCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

export function getReferenceMonth(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

async function markOverdueInvoices(storeId: string) {
  await prisma.platformInvoice.updateMany({
    where: {
      storeId,
      status: PlatformInvoiceStatus.OPEN,
      dueDate: {
        lt: startOfDay(new Date()),
      },
    },
    data: {
      status: PlatformInvoiceStatus.OVERDUE,
    },
  });
}

function getDefaultDueDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 10, 23, 59, 59, 999);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLegacyUsage(
  planUsage: Awaited<ReturnType<typeof getStorePlanUsage>>,
  key: "products" | "users" | "views",
) {
  const item = planUsage.limits.find((limit) => limit.key === key);

  return {
    used: item?.used ?? 0,
    limit: item?.limit ?? null,
  };
}
