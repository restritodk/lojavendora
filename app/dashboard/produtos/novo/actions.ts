"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { canCreateProduct } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";

const MAX_PRODUCT_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type ProductActionResult = {
  type: "success" | "error";
  message: string;
};

export async function createProductAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return errorResult("Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "produtos");

  const productLimit = await canCreateProduct(store.id);
  if (!productLimit.allowed) {
    return errorResult(productLimit.reason ?? "Limite de produtos do plano atingido.");
  }

  const name = getValue(formData, "name");
  const price = parseCurrency(getValue(formData, "price"));

  if (!name) {
    return errorResult("Informe o nome do produto.");
  }

  if (price <= 0) {
    return errorResult("Informe um preço de venda válido.");
  }

  const slug = await uniqueProductSlug(store.id, slugify(name));
  const categoryId = await getCategoryIdForStore(formData, store.id);

  try {
    const uploadedImages = await saveProductImages(formData);

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        name,
        slug,
        price,
        oldPrice: optionalDecimal(formData, "oldPrice"),
        costPrice: optionalDecimal(formData, "costPrice"),
        shortDescription: getValue(formData, "shortDescription") || null,
        description: getValue(formData, "description") || null,
        brand: getValue(formData, "brand") || null,
        model: getValue(formData, "model") || null,
        warranty: getValue(formData, "warranty") || null,
        imageUrl: uploadedImages[0]?.url ?? getValue(formData, "imageUrl") ?? null,
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
        categoryId,
        images: {
          create: uploadedImages.map((image, index) => ({
            url: image.url,
            sortOrder: index,
          })),
        },
      },
    });
    await saveFixedFreightRules(store.id, product.id, formData);
    revalidatePath(`/store/${store.subdomain}`);
  } catch (error) {
    console.error(error);
    return errorResult("Não foi possível cadastrar o produto. Verifique os dados e as imagens.");
  }

  return {
    type: "success",
    message: "Produto cadastrado com sucesso.",
  };
}

async function getCategoryIdForStore(formData: FormData, storeId: string) {
  const categoryId = getValue(formData, "categoryId");

  if (!categoryId) {
    return undefined;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId,
    },
    select: { id: true },
  });

  return category?.id;
}

function errorResult(message: string): ProductActionResult {
  return {
    type: "error",
    message,
  };
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

async function saveProductImages(formData: FormData) {
  const rawOrder = getValue(formData, "imageOrder");
  const order = rawOrder ? rawOrder.split(",").filter(Boolean) : [];
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > MAX_PRODUCT_IMAGES) {
    throw new Error("Limite máximo de 10 imagens.");
  }

  const orderedFiles = order.length
    ? order
        .map((name) => files.find((file) => file.name === name))
        .filter((file): file is File => Boolean(file))
    : files;
  const remainingFiles = files.filter(
    (file) => !orderedFiles.some((orderedFile) => orderedFile.name === file.name),
  );
  const finalFiles = [...orderedFiles, ...remainingFiles].slice(0, MAX_PRODUCT_IMAGES);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

  await mkdir(uploadDir, { recursive: true });

  const savedImages = [];

  for (const file of finalFiles) {
    if (!file.type.startsWith("image/")) {
      continue;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`A imagem ${file.name} ultrapassa 5MB.`);
    }

    const extension = path.extname(file.name) || ".jpg";
    const fileName = `${crypto.randomUUID()}${extension}`;
    const bytes = await file.arrayBuffer();

    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));
    savedImages.push({ url: `/uploads/products/${fileName}` });
  }

  return savedImages;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
