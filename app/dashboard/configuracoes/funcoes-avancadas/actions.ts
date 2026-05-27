"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getAdvancedFeature } from "@/lib/advanced-features";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { getPlanBySlug, isPlanAtLeast } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export type AdvancedSettingsResult = {
  type: "success" | "error";
  message: string;
};

export async function saveAdvancedFeatureAction(
  featureId: string,
  formData: FormData,
): Promise<AdvancedSettingsResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  if (!featureId) {
    return result("error", "Função avançada inválida.");
  }

  const feature = getAdvancedFeature(featureId);

  if (!feature) {
    return result("error", "Função avançada não encontrada.");
  }

  const active = formData.get("__active") === "true";
  const values = collectValues(formData);

  if (active) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        storeId: store.id,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
    const currentPlan = getPlanBySlug(subscription?.plan.slug);

    if (!isPlanAtLeast(currentPlan.slug, feature.minimumPlanSlug)) {
      const minimumPlan = getPlanBySlug(feature.minimumPlanSlug);

      return result(
        "error",
        `A função "${feature.title}" está disponível a partir do plano ${minimumPlan.name}.`,
      );
    }
  }

  await prisma.storeAdvancedSetting.upsert({
    where: {
      storeId_featureId: {
        storeId: store.id,
        featureId,
      },
    },
    update: {
      active,
      values,
    },
    create: {
      storeId: store.id,
      featureId,
      active,
      values,
    },
  });

  revalidatePath("/dashboard/configuracoes/funcoes-avancadas");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Configuração salva com sucesso para esta loja.");
}

function collectValues(formData: FormData) {
  const values: Record<string, string | string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "__active" || typeof value !== "string") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(values, key)) {
      const current = values[key];
      values[key] = Array.isArray(current) ? [...current, value] : [current, value];
      continue;
    }

    values[key] = value;
  }

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value) && value.includes("false") && value.includes("true")) {
      values[key] = "true";
    }
  }

  return values;
}

function result(
  type: AdvancedSettingsResult["type"],
  message: string,
): AdvancedSettingsResult {
  return { type, message };
}
