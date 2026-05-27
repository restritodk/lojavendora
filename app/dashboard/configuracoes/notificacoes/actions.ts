"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { notificationDefinitions } from "@/lib/store-notifications";

export type NotificationSettingsResult = {
  type: "success" | "error";
  message: string;
};

export async function saveNotificationSettingsAction(
  formData: FormData,
): Promise<NotificationSettingsResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  await prisma.$transaction(
    notificationDefinitions.map((definition) =>
      prisma.storeNotificationSetting.upsert({
        where: {
          storeId_type: {
            storeId: store.id,
            type: definition.type,
          },
        },
        update: {
          active: formData.get(`${definition.type}:active`) === "true",
          threshold: parseThreshold(formData.get(`${definition.type}:threshold`)),
        },
        create: {
          storeId: store.id,
          type: definition.type,
          active: formData.get(`${definition.type}:active`) === "true",
          threshold: parseThreshold(formData.get(`${definition.type}:threshold`)),
        },
      }),
    ),
  );

  revalidatePath("/dashboard/configuracoes/notificacoes");
  revalidatePath("/dashboard");

  return result("success", "Preferências de notificações salvas com sucesso.");
}

function parseThreshold(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function result(
  type: NotificationSettingsResult["type"],
  message: string,
): NotificationSettingsResult {
  return { type, message };
}
