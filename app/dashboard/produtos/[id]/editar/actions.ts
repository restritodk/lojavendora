"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

export type UpdateProductResult = {
  type: "success" | "error";
  message: string;
};

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<UpdateProductResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: store.id,
    },
    select: { id: true },
  });

  if (!product) {
    return result("error", "Produto não encontrado.");
  }

  const name = getValue(formData, "name");
  const price = parseCurrency(getValue(formData, "price"));

  if (!name) {
    return result("error", "Informe o nome do produto.");
  }

  if (price <= 0) {
    return result("error", "Informe um preço de venda válido.");
  }

  const categoryId = await getCategoryIdForStore(formData, store.id);

  try {
    await prisma.product.updateMany({
      where: {
        id: product.id,
        storeId: store.id,
      },
      data: {
        name,
        price,
        oldPrice: optionalDecimal(formData, "oldPrice"),
        costPrice: optionalDecimal(formData, "costPrice"),
        shortDescription: getValue(formData, "shortDescription") || null,
        description: getValue(formData, "description") || null,
        brand: getValue(formData, "brand") || null,
        model: getValue(formData, "model") || null,
        warranty: getValue(formData, "warranty") || null,
        imageUrl: getValue(formData, "imageUrl") || null,
        youtubeUrl: getValue(formData, "youtubeUrl") || null,
        showVideoOnListing: formData.get("showVideoOnListing") === "on",
        freightType: getValue(formData, "freightType") || null,
        weight: optionalDecimal(formData, "weight"),
        height: optionalDecimal(formData, "height"),
        width: optionalDecimal(formData, "width"),
        length: optionalDecimal(formData, "length"),
        declaredValue: optionalDecimal(formData, "declaredValue"),
        additionalFreight: optionalDecimal(formData, "additionalFreight"),
        allowOutOfStock: formData.get("allowOutOfStock") === "on",
        stock: parseInteger(getValue(formData, "stock"), 0),
        criticalStock: parseInteger(getValue(formData, "criticalStock"), 5),
        showOnSite: formData.get("showOnSite") === "on",
        showOnHome: formData.get("showOnHome") === "on",
        isLaunch: formData.get("isLaunch") === "on",
        minQuantity: parseInteger(getValue(formData, "minQuantity"), 1),
        priority: getValue(formData, "priority") || null,
        recommendedMode: getValue(formData, "recommendedMode") || null,
        tags: getValue(formData, "tags") || null,
        customCode: getValue(formData, "customCode") || null,
        ageGroup: getValue(formData, "ageGroup") || null,
        genderTarget: getValue(formData, "genderTarget") || null,
        status: getValue(formData, "status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        categoryId,
      },
    });
    await saveFixedFreightRules(store.id, product.id, formData);
  } catch (error) {
    console.error(error);
    return result("error", "Não foi possível atualizar o produto.");
  }

  revalidatePath("/dashboard/produtos");
  revalidatePath(`/store/${store.subdomain}`);
  revalidatePath(`/store/${store.subdomain}/produto`);

  return result("success", "Produto atualizado com sucesso.");
}

async function getCategoryIdForStore(formData: FormData, storeId: string) {
  const categoryId = getValue(formData, "categoryId");

  if (!categoryId) {
    return null;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId,
    },
    select: { id: true },
  });

  return category?.id ?? null;
}

function result(type: UpdateProductResult["type"], message: string) {
  return { type, message };
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseCurrency(value: string) {
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDecimal(formData: FormData, key: string) {
  const value = getValue(formData, key);
  return value ? parseCurrency(value) : undefined;
}

async function saveFixedFreightRules(storeId: string, productId: string, formData: FormData) {
  const rules = collectFixedFreightRules(formData);

  await prisma.storeAdvancedSetting.upsert({
    where: {
      storeId_featureId: {
        storeId,
        featureId: `product:${productId}:fixed-freight`,
      },
    },
    update: {
      active: rules.length > 0,
      values: { rules },
    },
    create: {
      storeId,
      featureId: `product:${productId}:fixed-freight`,
      active: rules.length > 0,
      values: { rules },
    },
  });
}

function collectFixedFreightRules(formData: FormData) {
  const states = formData.getAll("fixedFreightState");
  const values = formData.getAll("fixedFreightValue");
  const minDays = formData.getAll("fixedFreightMinDays");
  const maxDays = formData.getAll("fixedFreightMaxDays");
  const rules = [];

  for (let index = 0; index < states.length; index += 1) {
    const state = typeof states[index] === "string" ? states[index].toString().trim().toUpperCase() : "";
    const value = typeof values[index] === "string" ? parseCurrency(values[index].toString()) : 0;
    const min = typeof minDays[index] === "string" ? parseInteger(minDays[index].toString(), 0) : 0;
    const max = typeof maxDays[index] === "string" ? parseInteger(maxDays[index].toString(), min) : min;

    if (state && value >= 0 && min > 0 && max >= min) {
      rules.push({ state, value, minDays: min, maxDays: max });
    }
  }

  return rules;
}

function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

