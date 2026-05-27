import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
export { getNextPlan, getPlanBySlug, getPlanRank, isPlanAtLeast } from "@/lib/plan-utils";

export type PlanLimitKey = "products" | "orders" | "views" | "storage" | "users";

export type PlanUsageItem = {
  key: PlanLimitKey;
  label: string;
  used: number;
  limit: number | null;
  percentage: number;
  reached: boolean;
  near: boolean;
};

export async function getStorePlanUsage(storeId: string) {
  const subscription = await getCurrentSubscription(storeId);
  const usage = await getRawUsage(storeId, subscription?.currentPeriodStart ?? null);
  const subscriptionCheck = await checkStoreSubscription(storeId);
  const plan = subscription?.plan ?? null;
  const isUnlimited = Boolean(plan?.isUnlimited || plan?.slug === "loja-ilimitada");
  const isFreePlan = Number(plan?.price ?? 0) === 0;
  const expiresAt = subscription?.currentPeriodEnd ?? null;
  const daysRemaining = subscriptionCheck.daysRemaining;
  const isExpired = subscriptionCheck.daysOverdue > 0;

  const limits: PlanUsageItem[] = [
    buildUsageItem("products", "Produtos", usage.products, plan?.maxProducts ?? null, isUnlimited),
    buildUsageItem("orders", "Pedidos", usage.orders, plan?.maxOrders ?? null, isUnlimited),
    buildUsageItem("views", "Visualizações", usage.views, plan?.maxMonthlyVisits ?? null, isUnlimited),
    buildUsageItem("storage", "Armazenamento", usage.storageMb, plan?.maxStorageMb ?? null, isUnlimited),
    buildUsageItem("users", "Usuários/admins", usage.users, plan?.maxUsers ?? null, isUnlimited),
  ];

  const alerts = buildPlanAlerts({
    isUnlimited,
    isFreePlan,
    daysRemaining,
    subscriptionCheck,
    limits,
  });

  return {
    subscription,
    plan,
    usage,
    limits,
    alerts,
    isUnlimited,
    isFreePlan,
    isExpired,
    expiresAt,
    daysRemaining,
    subscriptionCheck,
  };
}

export async function canCreateProduct(storeId: string) {
  return canUsePlanLimit(storeId, "products");
}

export async function canActivateStaffUser(storeId: string, staffUserId?: string) {
  const usage = await getStorePlanUsage(storeId);
  const userLimit = usage.limits.find((limit) => limit.key === "users");
  const activeStaffCount = staffUserId
    ? await prisma.storeStaffUser.count({
        where: { storeId, active: true, id: { not: staffUserId } },
      })
    : usage.usage.users - 1;
  const usedUsersIncludingOwner = activeStaffCount + 1;

  return evaluateLimit({
    usage,
    key: "users",
    used: usedUsersIncludingOwner,
    limit: userLimit?.limit ?? null,
  });
}

export async function canCreateOrder(storeId: string) {
  return canUsePlanLimit(storeId, "orders");
}

export async function canRecordStoreView(storeId: string) {
  return canUsePlanLimit(storeId, "views");
}

export async function hasPlanFeature(storeId: string, featureId: string) {
  const usage = await getStorePlanUsage(storeId);

  if (usage.isUnlimited) {
    return { allowed: true };
  }

  if (!usage.plan) {
    return {
      allowed: false,
      reason: "Loja sem plano ativo.",
    };
  }

  if (usage.isExpired) {
    return {
      allowed: false,
      reason: "Seu plano está vencido. Regularize o pagamento para continuar usando este recurso.",
    };
  }

  const releasedFeatures = usage.plan.releasedFeatures ?? [];
  const hasFeature = releasedFeatures.includes(featureId);

  return {
    allowed: hasFeature,
    reason: hasFeature
      ? undefined
      : `O recurso solicitado não está disponível no plano ${usage.plan.name}.`,
  };
}

async function canUsePlanLimit(storeId: string, key: PlanLimitKey) {
  const usage = await getStorePlanUsage(storeId);
  const item = usage.limits.find((limit) => limit.key === key);

  return evaluateLimit({
    usage,
    key,
    used: item?.used ?? 0,
    limit: item?.limit ?? null,
  });
}

function evaluateLimit({
  usage,
  key,
  used,
  limit,
}: {
  usage: Awaited<ReturnType<typeof getStorePlanUsage>>;
  key: PlanLimitKey;
  used: number;
  limit: number | null;
}) {
  if (!usage.plan) {
    return {
      allowed: false,
      reason: "Loja sem plano ativo.",
    };
  }

  if (usage.isUnlimited) {
    return { allowed: true };
  }

  if (usage.subscriptionCheck.isBlocked) {
    return {
      allowed: false,
      reason: "Seu plano está bloqueado por inadimplência. Regularize o pagamento para continuar.",
    };
  }

  if (limit === null) {
    return { allowed: true };
  }

  if (used >= limit) {
    return {
      allowed: false,
      reason: getLimitMessage(usage.isFreePlan, key),
    };
  }

  return { allowed: true };
}

async function getCurrentSubscription(storeId: string) {
  return prisma.subscription.findFirst({
    where: {
      storeId,
      status: {
        in: ["TRIALING", "ACTIVE", "PAST_DUE"],
      },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

async function getRawUsage(storeId: string, periodStart: Date | null) {
  const start = periodStart ?? new Date(0);
  const [products, orders, views, users] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.order.count({ where: { storeId, createdAt: { gte: start } } }),
    prisma.storePageView.count({ where: { storeId, createdAt: { gte: start } } }),
    prisma.storeStaffUser.count({ where: { storeId, active: true } }),
  ]);

  return {
    products,
    orders,
    views,
    users: users + 1,
    storageMb: 0,
  };
}

function buildUsageItem(
  key: PlanLimitKey,
  label: string,
  used: number,
  limit: number | null,
  isUnlimited: boolean,
): PlanUsageItem {
  const effectiveLimit = isUnlimited ? null : limit;
  const percentage = effectiveLimit && effectiveLimit > 0
    ? Math.min(100, Math.round((used / effectiveLimit) * 100))
    : 0;

  return {
    key,
    label,
    used,
    limit: effectiveLimit,
    percentage,
    reached: Boolean(effectiveLimit !== null && used >= effectiveLimit),
    near: Boolean(effectiveLimit !== null && used >= effectiveLimit * 0.9 && used < effectiveLimit),
  };
}

function buildPlanAlerts({
  isUnlimited,
  isFreePlan,
  daysRemaining,
  subscriptionCheck,
  limits,
}: {
  isUnlimited: boolean;
  isFreePlan: boolean;
  daysRemaining: number | null;
  subscriptionCheck: Awaited<ReturnType<typeof checkStoreSubscription>>;
  limits: PlanUsageItem[];
}) {
  if (isUnlimited) {
    return [];
  }

  const alerts = [];
  const reached = limits.find((limit) => limit.reached);
  const near = limits.find((limit) => limit.near);

  if (reached) {
    alerts.push({
      type: "limit-reached",
      title: "Limite atingido",
      message: isFreePlan
        ? `Você atingiu o limite do seu plano gratuito em ${reached.label.toLowerCase()}. Faça upgrade para continuar.`
        : `Você atingiu o limite de ${reached.label.toLowerCase()} do seu plano.`,
    });
  } else if (near) {
    alerts.push({
      type: "limit-near",
      title: "Limite próximo",
      message: `Você utilizou ${near.percentage}% do limite de ${near.label.toLowerCase()} do seu plano.`,
    });
  }

  if (subscriptionCheck.isBlocked) {
    alerts.push({
      type: "plan-blocked",
      title: "Plano bloqueado",
      message: "Seu plano está bloqueado por inadimplência. Pague a fatura para reativar automaticamente.",
    });
  } else if (subscriptionCheck.isInGracePeriod) {
    alerts.push({
      type: "plan-grace",
      title: "Pagamento pendente",
      message: `Seu plano está vencido. Você possui ${subscriptionCheck.graceDaysRemaining} dia(s) para regularizar o pagamento antes do bloqueio da loja.`,
    });
  } else if (daysRemaining !== null && daysRemaining <= 3) {
    alerts.push({
      type: "plan-expiring",
      title: "Plano vencendo",
      message: `Seu plano vence em ${Math.max(daysRemaining, 0)} dia(s).`,
    });
  }

  return alerts;
}

function getLimitMessage(isFreePlan: boolean, key: PlanLimitKey) {
  const labels: Record<PlanLimitKey, string> = {
    products: "adicionando produtos",
    orders: "recebendo pedidos",
    views: "recebendo visualizações",
    storage: "usando armazenamento",
    users: "adicionando usuários/admins",
  };

  if (isFreePlan) {
    return `Você atingiu o limite do seu plano gratuito. Faça upgrade para continuar ${labels[key]}.`;
  }

  return `Você atingiu o limite do seu plano. Altere o plano para continuar ${labels[key]}.`;
}

