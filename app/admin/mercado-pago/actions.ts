"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PlatformMercadoPagoResult = {
  type: "success" | "error";
  message: string;
};

export async function savePlatformMercadoPagoAction(formData: FormData): Promise<PlatformMercadoPagoResult> {
  await requireAdmin();

  const publicKey = getValue(formData, "publicKey");
  const accessToken = getValue(formData, "accessToken");
  const active = formData.get("active") === "on";
  const sandbox = formData.get("sandbox") === "on";

  if (active && !accessToken) {
    return result("error", "Informe o access token para ativar o Mercado Pago da plataforma.");
  }

  await prisma.platformPaymentSetting.upsert({
    where: { provider: "mercado-pago" },
    update: {
      publicKey,
      accessToken,
      active,
      sandbox,
    },
    create: {
      provider: "mercado-pago",
      publicKey,
      accessToken,
      active,
      sandbox,
    },
  });

  revalidatePath("/admin/mercado-pago");
  return result("success", "Credenciais Mercado Pago da plataforma salvas.");
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function result(type: PlatformMercadoPagoResult["type"], message: string) {
  return { type, message };
}
