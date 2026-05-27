"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

export type ApplyThemeResult = {
  type: "success" | "error";
  message: string;
};

export async function applyStoreThemeAction(
  templateId: string,
): Promise<ApplyThemeResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const template = await prisma.storeTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      name: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      bannerTitle: true,
      bannerSubtitle: true,
    },
  });

  if (!template) {
    return result("error", "Tema não encontrado.");
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      storeTemplateId: template.id,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      accentColor: template.accentColor,
      bannerTitle: template.bannerTitle,
      bannerSubtitle: template.bannerSubtitle,
    },
  });

  revalidatePath("/dashboard/configuracoes/aparencia");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", `Tema ${template.name} aplicado com sucesso.`);
}

function result(
  type: ApplyThemeResult["type"],
  message: string,
): ApplyThemeResult {
  return { type, message };
}
