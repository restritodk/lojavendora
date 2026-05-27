import { NextResponse } from "next/server";
import { isAllowedAppId } from "@/lib/integrations/app-catalog";
import { createIntegrationLog } from "@/lib/integrations/settings";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ storeId: string; appId: string }> },
) {
  const { storeId, appId } = await context.params;

  if (!isAllowedAppId(appId)) {
    return NextResponse.json({ error: "Aplicativo inválido." }, { status: 404 });
  }

  const setting = await prisma.storeAdvancedSetting.findUnique({
    where: {
      storeId_featureId: {
        storeId,
        featureId: `app:${appId}`,
      },
    },
    select: {
      active: true,
    },
  });

  if (!setting?.active) {
    return NextResponse.json({ error: "Aplicativo desativado para esta loja." }, { status: 403 });
  }

  const payload = await safeReadJson(request);

  await prisma.storeIntegrationWebhook.create({
    data: {
      storeId,
      appId,
      event: request.headers.get("x-event-type") || request.headers.get("x-topic") || "webhook",
      payload,
    },
  });

  await createIntegrationLog({
    storeId,
    appId,
    action: "webhook",
    status: "success",
    message: "Webhook recebido para a loja.",
  });

  return NextResponse.json({ ok: true });
}

async function safeReadJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
