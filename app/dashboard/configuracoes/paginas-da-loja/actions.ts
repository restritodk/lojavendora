"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

export type StorePageActionResult = {
  type: "success" | "error";
  message: string;
};

export async function saveStorePageAction(
  pageId: string | null,
  formData: FormData,
): Promise<StorePageActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const title = getValue(formData, "title");
  const description = getValue(formData, "description");
  const content = getValue(formData, "content");
  const active = formData.get("active") === "true";
  const slug = normalizeSlug(getValue(formData, "slug") || title);

  if (!title || !content || !slug) {
    return result("error", "Informe título, link e conteúdo da página.");
  }

  const slugConflict = await prisma.storePage.findFirst({
    where: {
      storeId: store.id,
      slug,
      ...(pageId ? { id: { not: pageId } } : {}),
    },
    select: { id: true },
  });

  if (slugConflict) {
    return result("error", "Já existe uma página com este link nesta loja.");
  }

  if (pageId) {
    const updated = await prisma.storePage.updateMany({
      where: {
        id: pageId,
        storeId: store.id,
      },
      data: {
        title,
        slug,
        description: description || null,
        content,
        active,
      },
    });

    if (updated.count === 0) {
      return result("error", "Página não encontrada nesta loja.");
    }
  } else {
    await prisma.storePage.create({
      data: {
        storeId: store.id,
        title,
        slug,
        description: description || null,
        content,
        active,
      },
    });
  }

  revalidatePath("/dashboard/configuracoes/paginas-da-loja");
  revalidatePath(`/store/${store.subdomain}`);
  revalidatePath(`/store/${store.subdomain}/pagina/${slug}`);

  return result("success", pageId ? "Página atualizada com sucesso." : "Página criada com sucesso.");
}

export async function deleteStorePageAction(pageId: string): Promise<StorePageActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const deleted = await prisma.storePage.deleteMany({
    where: {
      id: pageId,
      storeId: store.id,
    },
  });

  if (deleted.count === 0) {
    return result("error", "Página não encontrada nesta loja.");
  }

  revalidatePath("/dashboard/configuracoes/paginas-da-loja");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Página excluída com sucesso.");
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function result(
  type: StorePageActionResult["type"],
  message: string,
): StorePageActionResult {
  return { type, message };
}
