import { prisma } from "@/lib/prisma";

export const SUBSCRIPTION_GRACE_DAYS = 7;

export type StoreSubscriptionState =
  | "free"
  | "active"
  | "pending_payment"
  | "grace_period"
  | "blocked";

export type StoreSubscriptionCheck = {
  state: StoreSubscriptionState;
  isFree: boolean;
  isBlocked: boolean;
  isInGracePeriod: boolean;
  financialStatus: "isento" | "em_dia" | "pagamento_pendente" | "bloqueado";
  daysRemaining: number | null;
  daysOverdue: number;
  graceDaysRemaining: number | null;
  currentPeriodEnd: Date | null;
  planName: string;
};

export async function checkStoreSubscription(storeId: string): Promise<StoreSubscriptionCheck> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      storeId,
      status: {
        in: ["ACTIVE", "TRIALING", "PAST_DUE"],
      },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!subscription) {
    return {
      state: "blocked",
      isFree: false,
      isBlocked: true,
      isInGracePeriod: false,
      financialStatus: "bloqueado",
      daysRemaining: null,
      daysOverdue: SUBSCRIPTION_GRACE_DAYS + 1,
      graceDaysRemaining: 0,
      currentPeriodEnd: null,
      planName: "Sem plano",
    };
  }

  const isFree = Number(subscription.plan.price) === 0;

  if (isFree) {
    return {
      state: "free",
      isFree: true,
      isBlocked: false,
      isInGracePeriod: false,
      financialStatus: "isento",
      daysRemaining: null,
      daysOverdue: 0,
      graceDaysRemaining: null,
      currentPeriodEnd: null,
      planName: subscription.plan.name,
    };
  }

  const currentPeriodEnd = subscription.currentPeriodEnd;

  if (!currentPeriodEnd) {
    return {
      state: "pending_payment",
      isFree: false,
      isBlocked: false,
      isInGracePeriod: false,
      financialStatus: "pagamento_pendente",
      daysRemaining: null,
      daysOverdue: 0,
      graceDaysRemaining: SUBSCRIPTION_GRACE_DAYS,
      currentPeriodEnd: null,
      planName: subscription.plan.name,
    };
  }

  const now = startOfDay(new Date());
  const end = startOfDay(currentPeriodEnd);
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);

  if (daysRemaining >= 0) {
    return {
      state: "active",
      isFree: false,
      isBlocked: false,
      isInGracePeriod: false,
      financialStatus: "em_dia",
      daysRemaining,
      daysOverdue: 0,
      graceDaysRemaining: null,
      currentPeriodEnd,
      planName: subscription.plan.name,
    };
  }

  const daysOverdue = Math.abs(daysRemaining);
  const isBlocked = daysOverdue > SUBSCRIPTION_GRACE_DAYS;

  return {
    state: isBlocked ? "blocked" : "grace_period",
    isFree: false,
    isBlocked,
    isInGracePeriod: !isBlocked,
    financialStatus: isBlocked ? "bloqueado" : "pagamento_pendente",
    daysRemaining: 0,
    daysOverdue,
    graceDaysRemaining: Math.max(SUBSCRIPTION_GRACE_DAYS - daysOverdue, 0),
    currentPeriodEnd,
    planName: subscription.plan.name,
  };
}

export function getPaidPeriodEnd(from = new Date(), durationDays = 30) {
  const date = new Date(from);
  date.setDate(date.getDate() + durationDays);
  return date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
