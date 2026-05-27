import { prisma } from "@/lib/prisma";

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(value: unknown) {
  const amount = Number(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export async function getAdminPlans() {
  return prisma.plan.findMany({
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
}

export async function getAdminPlanById(id: string) {
  return prisma.plan.findUnique({
    where: { id },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
}
