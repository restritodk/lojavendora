"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { savePublicImageUpload } from "@/lib/uploads";

export type GeneralSettingsResult = {
  type: "success" | "error";
  message: string;
};

export async function updateGeneralSettingsAction(
  formData: FormData,
): Promise<GeneralSettingsResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const name = getValue(formData, "name");

  if (!name) {
    return result("error", "Informe o título da loja.");
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      name,
      active: formData.get("active") === "true",
      logoUrl: normalizeNullable(getValue(formData, "logoUrl")),
    },
  });

  revalidatePath("/dashboard/configuracoes/gerais");
  revalidatePath(`/store/${store.subdomain}`);
  revalidatePath(`/store/${store.subdomain}/ajuda`);
  revalidatePath(`/store/${store.subdomain}/login`);
  revalidatePath(`/store/${store.subdomain}/pedidos`);
  revalidatePath("/store/[slug]/categoria/[categorySlug]", "page");
  revalidatePath("/store/[slug]/produto/[productSlug]", "page");
  revalidatePath("/store/[slug]/pagina/[pageSlug]", "page");

  return result("success", "Configurações gerais salvas com sucesso.");
}

export async function addStoreBannerAction(
  formData: FormData,
): Promise<GeneralSettingsResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  let imageUrl = getValue(formData, "imageUrl");
  const file = formData.get("imageFile");

  try {
    if (file instanceof File && file.size > 0) {
      imageUrl = await savePublicImageUpload(file, `stores/${store.id}/banners`);
    }
  } catch (error) {
    return result(
      "error",
      error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
    );
  }

  if (!imageUrl) {
    return result("error", "Informe um link ou envie uma imagem para o banner.");
  }

  const totalBanners = await prisma.storeBanner.count({
    where: { storeId: store.id },
  });

  await prisma.storeBanner.create({
    data: {
      storeId: store.id,
      imageUrl,
      title: normalizeNullable(getValue(formData, "title")),
      active: formData.get("active") !== "false",
      sortOrder: totalBanners,
    },
  });

  await syncLegacyBannerImage(store.id);
  revalidateStorePaths(store.subdomain);

  return result("success", "Banner adicionado com sucesso.");
}

export async function updateStoreBannerStatusAction(
  bannerId: string,
  active: boolean,
): Promise<GeneralSettingsResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const updated = await prisma.storeBanner.updateMany({
    where: {
      id: bannerId,
      storeId: store.id,
    },
    data: { active },
  });

  if (updated.count === 0) {
    return result("error", "Banner não encontrado nesta loja.");
  }

  await syncLegacyBannerImage(store.id);
  revalidateStorePaths(store.subdomain);

  return result("success", active ? "Banner ativado." : "Banner desativado.");
}

export async function deleteStoreBannerAction(
  bannerId: string,
): Promise<GeneralSettingsResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const deleted = await prisma.storeBanner.deleteMany({
    where: {
      id: bannerId,
      storeId: store.id,
    },
  });

  if (deleted.count === 0) {
    return result("error", "Banner não encontrado nesta loja.");
  }

  await syncLegacyBannerImage(store.id);
  revalidateStorePaths(store.subdomain);

  return result("success", "Banner excluído com sucesso.");
}

function result(
  type: GeneralSettingsResult["type"],
  message: string,
): GeneralSettingsResult {
  return { type, message };
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullable(value: string) {
  return value ? value : null;
}

async function syncLegacyBannerImage(storeId: string) {
  const banner = await prisma.storeBanner.findFirst({
    where: {
      storeId,
      active: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { imageUrl: true },
  });

  await prisma.store.update({
    where: { id: storeId },
    data: {
      bannerImageUrl: banner?.imageUrl ?? null,
    },
  });
}

function revalidateStorePaths(storeSlug: string) {
  revalidatePath("/dashboard/configuracoes/gerais");
  revalidatePath(`/store/${storeSlug}`);
  revalidatePath("/store/[slug]/categoria/[categorySlug]", "page");
  revalidatePath("/store/[slug]/produto/[productSlug]", "page");
  revalidatePath("/store/[slug]/pagina/[pageSlug]", "page");
}
