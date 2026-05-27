"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getAppCatalogEntry, isAllowedAppId } from "@/lib/integrations/app-catalog";
import {
  saveStoreIntegrationSettings,
} from "@/lib/integrations/settings";
import {
  syncStoreIntegration,
  testStoreIntegrationConnection,
} from "@/lib/integrations/adapters";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

const appPlanRequirements: Record<string, "free" | "inicial" | "mais"> = {
  "pontos-cashback": "mais",
  "facebook-instagram": "inicial",
  mailchimp: "mais",
  "rd-station": "mais",
  "sigep-correios": "mais",
  "melhor-envio": "mais",
  nfe: "mais",
  bling: "mais",
  kangu: "mais",
  skyhub: "mais",
  "clearsale-total": "mais",
};

const planRank: Record<string, number> = {
  "loja-gratis": 0,
  "loja-inicial": 1,
  "loja-mais": 2,
  "loja-completa": 3,
  "loja-ilimitada": 4,
};

const requirementRank = {
  free: 0,
  inicial: 1,
  mais: 2,
};

export type AppIntegrationResult = {
  type: "success" | "error";
  message: string;
};

export async function saveAppIntegrationAction(
  appId: string,
  formData: FormData,
): Promise<AppIntegrationResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  if (!appId || !isAllowedAppId(appId)) {
    return result("error", "Aplicativo inválido.");
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      storeId: store.id,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      plan: {
        select: { slug: true },
      },
    },
  });

  const currentPlanRank = planRank[subscription?.plan.slug ?? "loja-gratis"] ?? 0;
  const requiredPlan = appPlanRequirements[appId] ?? "free";

  if (currentPlanRank < requirementRank[requiredPlan]) {
    return result(
      "error",
      "Este aplicativo não está disponível para o plano atual desta loja.",
    );
  }

  await saveStoreIntegrationSettings({
    storeId: store.id,
    appId,
    active: formData.get("__active") === "true",
    values: collectValues(formData),
  });

  revalidatePath("/dashboard/configuracoes/aplicativos");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Aplicativo salvo com sucesso para esta loja.");
}

export async function testAppIntegrationAction(appId: string): Promise<AppIntegrationResult> {
  const store = await getCurrentStoreForApp(appId);

  if ("type" in store) {
    return store;
  }

  const testResult = await testStoreIntegrationConnection(store.id, appId);

  return result(testResult.success ? "success" : "error", testResult.message);
}

export async function syncAppIntegrationAction(appId: string): Promise<AppIntegrationResult> {
  const store = await getCurrentStoreForApp(appId);

  if ("type" in store) {
    return store;
  }

  const syncResult = await syncStoreIntegration(store.id, appId);

  return result(syncResult.success ? "success" : "error", syncResult.message);
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

  return values;
}

async function getCurrentStoreForApp(appId: string) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  if (!appId || !getAppCatalogEntry(appId)) {
    return result("error", "Aplicativo inválido.");
  }

  return store;
}

function result(
  type: AppIntegrationResult["type"],
  message: string,
): AppIntegrationResult {
  return { type, message };
}
