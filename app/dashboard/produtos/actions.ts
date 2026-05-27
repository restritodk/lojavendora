"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";

export type ProductListActionResult = {
  type: "success" | "error";
  message: string;
};

export async function duplicateProductAction(
  productId: string,
): Promise<ProductListActionResult> {
  const context = await getProductContext(productId);

  if (!context) {
    return result("error", "Produto não encontrado.");
  }

  const { product, store } = context;
  const slug = await uniqueProductSlug(store.id, slugify(`${product.name} copia`));

  await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: product.categoryId,
      name: `${product.name} (cópia)`,
      slug,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      oldPrice: product.oldPrice,
      costPrice: product.costPrice,
      brand: product.brand,
      model: product.model,
      warranty: product.warranty,
      imageUrl: product.imageUrl,
      youtubeUrl: product.youtubeUrl,
      showVideoOnListing: product.showVideoOnListing,
      freightType: product.freightType,
      weight: product.weight,
      height: product.height,
      width: product.width,
      length: product.length,
      declaredValue: product.declaredValue,
      additionalFreight: product.additionalFreight,
      allowOutOfStock: product.allowOutOfStock,
      stock: product.stock,
      criticalStock: product.criticalStock,
      showOnSite: product.showOnSite,
      showOnHome: product.showOnHome,
      isLaunch: product.isLaunch,
      minQuantity: product.minQuantity,
      priority: product.priority,
      recommendedMode: product.recommendedMode,
      tags: product.tags,
      customCode: product.customCode,
      ageGroup: product.ageGroup,
      genderTarget: product.genderTarget,
      status: product.status,
      images: {
        create: product.images.map((image) => ({
          url: image.url,
          sortOrder: image.sortOrder,
        })),
      },
    },
  });

  refreshProductPaths(store.subdomain);
  return result("success", "Produto duplicado com sucesso.");
}

export async function deactivateProductAction(
  productId: string,
): Promise<ProductListActionResult> {
  const context = await getProductContext(productId);

  if (!context) {
    return result("error", "Produto não encontrado.");
  }

  await prisma.product.updateMany({
    where: {
      id: context.product.id,
      storeId: context.store.id,
    },
    data: {
      status: "INACTIVE",
      showOnSite: false,
    },
  });

  refreshProductPaths(context.store.subdomain);
  return result("success", "Produto desativado com sucesso.");
}

export async function deleteProductAction(
  productId: string,
): Promise<ProductListActionResult> {
  const context = await getProductContext(productId);

  if (!context) {
    return result("error", "Produto não encontrado.");
  }

  await prisma.product.deleteMany({
    where: {
      id: context.product.id,
      storeId: context.store.id,
    },
  });

  refreshProductPaths(context.store.subdomain);
  return result("success", "Produto excluído com sucesso.");
}

async function getProductContext(productId: string) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return null;
  }
  await requireStorePermission(user.id, store.id, "produtos");

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: store.id,
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!product) {
    return null;
  }

  return { product, store };
}

function refreshProductPaths(subdomain: string) {
  revalidatePath("/dashboard/produtos");
  revalidatePath(`/store/${subdomain}`);
}

function result(
  type: ProductListActionResult["type"],
  message: string,
): ProductListActionResult {
  return { type, message };
}

async function uniqueProductSlug(storeId: string, baseSlug: string) {
  let slug = baseSlug || "produto";
  let suffix = 1;

  while (
    await prisma.product.findUnique({
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
