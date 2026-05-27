import { prisma } from "@/lib/prisma";

export const clientStatuses = [
  "isento",
  "em-dia",
  "a-vencer",
  "vencido",
  "inadimplente",
  "vendido",
] as const;

export type ClientStatus = (typeof clientStatuses)[number];

export function getClientStatusLabel(status: ClientStatus) {
  const labels: Record<ClientStatus, string> = {
    "em-dia": "Em dia",
    isento: "Isento",
    "a-vencer": "A vencer",
    vencido: "Vencido",
    inadimplente: "Inadimplente",
    vendido: "Vendido",
  };

  return labels[status];
}

export function getClientStatus(currentPeriodEnd?: Date | null, isFreePlan = false): ClientStatus {
  if (isFreePlan) {
    return "isento";
  }

  if (!currentPeriodEnd) {
    return "vencido";
  }

  const now = new Date();
  const diffInMs = currentPeriodEnd.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays < -10) {
    return "inadimplente";
  }

  if (diffInDays < 0) {
    return "vencido";
  }

  if (diffInDays <= 7) {
    return "a-vencer";
  }

  return "em-dia";
}

export function formatDate(date?: Date | null) {
  if (!date) {
    return "Sem vencimento";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export async function getAdminClients(filters?: {
  query?: string;
  status?: string;
}) {
  const query = filters?.query?.trim();
  const status = filters?.status;

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      stores: {
        some: {},
      },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              {
                stores: {
                  some: {
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      stores: {
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true },
          },
        },
      },
    },
  });

  return users
    .map((user) => {
      const store = user.stores[0];
      const subscription = store?.subscriptions[0];
      const isFreePlan = Number(subscription?.plan.price ?? 0) === 0;
      const computedStatus = getClientStatus(subscription?.currentPeriodEnd, isFreePlan);

      return {
        id: user.id,
        name: user.name ?? "Sem nome",
        email: user.email,
        storeName: store?.name ?? "Sem loja",
        subdomain: store?.subdomain ?? "-",
        planName: subscription?.plan.name ?? "Sem plano",
        planId: subscription?.plan.id ?? "",
        status: computedStatus,
        statusLabel: getClientStatusLabel(computedStatus),
        dueDate: subscription?.currentPeriodEnd ?? null,
        dueDateLabel: formatDate(subscription?.currentPeriodEnd),
        dueDateInput: subscription?.currentPeriodEnd
          ? subscription.currentPeriodEnd.toISOString().slice(0, 10)
          : "",
      };
    })
    .filter((client) => {
      if (!status) {
        return true;
      }

      return client.status === status;
    });
}

export async function getAdminClientById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      stores: {
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true },
          },
        },
      },
    },
  });
}

export async function getActivePlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
  }));
}
