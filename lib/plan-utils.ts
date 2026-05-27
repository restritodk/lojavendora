import { vendoraPlans } from "@/lib/plans";

const planOrder = vendoraPlans.map((plan) => plan.slug);

export function getPlanBySlug(slug: string | null | undefined) {
  return vendoraPlans.find((plan) => plan.slug === slug) ?? vendoraPlans[0];
}

export function getPlanRank(slug: string | null | undefined) {
  const index = planOrder.indexOf(slug ?? "");
  return index >= 0 ? index : 0;
}

export function isPlanAtLeast(currentPlanSlug: string | null | undefined, requiredPlanSlug: string) {
  return getPlanRank(currentPlanSlug) >= getPlanRank(requiredPlanSlug);
}

export function getNextPlan(currentPlanSlug: string | null | undefined) {
  return vendoraPlans[getPlanRank(currentPlanSlug) + 1] ?? null;
}

