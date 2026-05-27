import { canRecordStoreView } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export async function recordStorePageView(storeId: string, path: string) {
  const viewLimit = await canRecordStoreView(storeId);

  if (!viewLimit.allowed) {
    return {
      recorded: false,
      blocked: true,
      message: viewLimit.reason ?? "Esta loja atingiu o limite de visualizações do plano.",
    };
  }

  await prisma.storePageView.create({
    data: {
      storeId,
      path,
    },
  });

  return {
    recorded: true,
    blocked: false,
  };
}
