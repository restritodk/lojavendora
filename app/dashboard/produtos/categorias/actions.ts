"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

export type CategoryActionResult = {
  type: "success" | "error";
  message: string;
};

export async function createCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const name = getValue(formData, "name");
  const parentId = getValue(formData, "parentId") || null;

  if (!name) {
    return result("error", "Informe o nome da categoria.");
  }

  if (parentId) {
    const parentCategory = await prisma.category.findFirst({
      where: {
        id: parentId,
        storeId: store.id,
      },
      select: { id: true },
    });

    if (!parentCategory) {
      return result("error", "Categoria principal inválida.");
    }
  }

  const slug = await uniqueCategorySlug(store.id, slugify(name));

  try {
    await prisma.category.create({
      data: {
        storeId: store.id,
        parentId,
        name,
        slug,
        description: getValue(formData, "description") || null,
        googleShoppingCategory:
          getValue(formData, "googleShoppingCategory") || null,
        active: formData.get("active") === "on",
        featured: parentId ? false : formData.get("featured") === "on",
        showContent: formData.get("showContent") === "on",
      },
    });
  } catch (error) {
    console.error(error);
    return result("error", "Não foi possível cadastrar a categoria.");
  }

  revalidatePath("/dashboard/produtos/categorias");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Categoria cadastrada com sucesso.");
}

export async function toggleCategoryStatusAction(
  categoryId: string,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId: store.id,
    },
    select: {
      id: true,
      active: true,
    },
  });

  if (!category) {
    return result("error", "Categoria não encontrada.");
  }

  await prisma.category.updateMany({
    where: {
      id: category.id,
      storeId: store.id,
    },
    data: { active: !category.active },
  });

  revalidatePath("/dashboard/produtos/categorias");
  revalidatePath(`/store/${store.subdomain}`);

  return result(
    "success",
    category.active
      ? "Categoria inativada com sucesso."
      : "Categoria ativada com sucesso.",
  );
}

export async function updateCategoryAction(
  categoryId: string,
  formData: FormData,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const name = getValue(formData, "name");

  if (!name) {
    return result("error", "Informe o nome da categoria.");
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId: store.id,
    },
    select: { id: true, parentId: true },
  });

  if (!category) {
    return result("error", "Categoria não encontrada.");
  }

  try {
    await prisma.category.updateMany({
      where: {
        id: category.id,
        storeId: store.id,
      },
      data: {
        name,
        description: getValue(formData, "description") || null,
        googleShoppingCategory:
          getValue(formData, "googleShoppingCategory") || null,
        active: formData.get("active") === "on",
        featured: category.parentId ? false : formData.get("featured") === "on",
        showContent: formData.get("showContent") === "on",
      },
    });
  } catch (error) {
    console.error(error);
    return result("error", "Não foi possível atualizar a categoria.");
  }

  revalidatePath("/dashboard/produtos/categorias");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Categoria atualizada com sucesso.");
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId: store.id,
    },
    select: {
      id: true,
      products: {
        where: { storeId: store.id },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!category) {
    return result("error", "Categoria não encontrada.");
  }

  if (category.products.length > 0) {
    return result(
      "error",
      "Não é possível excluir uma categoria que possui produtos. Inative a categoria ou remova os produtos dela primeiro.",
    );
  }

  await prisma.category.deleteMany({
    where: {
      id: category.id,
      storeId: store.id,
    },
  });

  revalidatePath("/dashboard/produtos/categorias");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Categoria excluída com sucesso.");
}

function result(
  type: CategoryActionResult["type"],
  message: string,
): CategoryActionResult {
  return { type, message };
}

async function uniqueCategorySlug(storeId: string, baseSlug: string) {
  let slug = baseSlug || "categoria";
  let suffix = 1;

  while (
    await prisma.category.findUnique({
      where: {
        storeId_slug: {
          storeId,
          slug,
        },
      },
      select: { id: true },
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
