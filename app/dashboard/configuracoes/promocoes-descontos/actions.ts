"use server";

import { revalidatePath } from "next/cache";
import {
  PromotionCampaignType,
  PromotionDiscountType,
  PromotionScope,
} from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";

export type PromotionActionResult = {
  type: "success" | "error";
  message: string;
};

const campaignTypes = new Set(Object.values(PromotionCampaignType));
const discountTypes = new Set(Object.values(PromotionDiscountType));
const scopes = new Set(Object.values(PromotionScope));

export async function savePromotionCampaignAction(
  campaignId: string | null,
  formData: FormData,
): Promise<PromotionActionResult> {
  const context = await getPromotionContext();
  const type = getEnumValue(formData, "type", campaignTypes);
  const name = getValue(formData, "name").trim();
  const discountType = getEnumValue(formData, "discountType", discountTypes);
  const scope = getEnumValue(formData, "scope", scopes);
  const discountValue = parseMoney(getValue(formData, "discountValue"));
  const minOrderValue = parseOptionalMoney(getValue(formData, "minOrderValue"));
  const minQuantity = parseOptionalInt(getValue(formData, "minQuantity"));
  const startsAt = parseDateTime(getValue(formData, "startsAtDate"), getValue(formData, "startsAtTime"));
  const endsAt = parseDateTime(getValue(formData, "endsAtDate"), getValue(formData, "endsAtTime"));
  const productIds = getAllValues(formData, "productIds");
  const categoryIds = getAllValues(formData, "categoryIds");
  const availableFor = getAllValues(formData, "availableFor");
  const couponCode = sanitizeCouponCode(getValue(formData, "couponCode"));
  const couponMaxUses = parseOptionalInt(getValue(formData, "couponMaxUses"));

  if (!type || !discountType || !scope) {
    return result("error", "Dados da promoção inválidos.");
  }

  if (!name) {
    return result("error", "Informe o nome para referência.");
  }

  if (discountValue <= 0) {
    return result("error", "Informe um desconto maior que zero.");
  }

  if (discountType === PromotionDiscountType.PERCENTAGE && discountValue > 100) {
    return result("error", "O desconto percentual não pode passar de 100%.");
  }

  if (type === PromotionCampaignType.WHOLESALE_RETAIL && (!minQuantity || minQuantity <= 0)) {
    return result("error", "Informe a quantidade mínima para atacado/varejo.");
  }

  if (type === PromotionCampaignType.ORDER_VALUE_DISCOUNT && (!minOrderValue || minOrderValue <= 0)) {
    return result("error", "Informe o valor mínimo da compra.");
  }

  if (endsAt && startsAt && endsAt < startsAt) {
    return result("error", "A data final precisa ser maior que a data inicial.");
  }

  const productConnect = await validateProducts(context.store.id, productIds);
  const categoryConnect = await validateCategories(context.store.id, categoryIds);

  if (scope === PromotionScope.SELECTED_PRODUCTS && productConnect.length === 0) {
    return result("error", "Selecione ao menos um produto.");
  }

  if (scope === PromotionScope.SELECTED_CATEGORIES && categoryConnect.length === 0) {
    return result("error", "Selecione ao menos uma categoria.");
  }

  const data = {
    storeId: context.store.id,
    type,
    name,
    active: getValue(formData, "active") === "true",
    discountType,
    discountValue,
    minOrderValue,
    minQuantity: type === PromotionCampaignType.WHOLESALE_RETAIL ? minQuantity : null,
    startsAt,
    endsAt,
    availableFor: availableFor.length > 0 ? availableFor : ["Pessoa Física", "Pessoa Jurídica"],
    scope,
    metadata: {
      notes: getValue(formData, "notes").trim(),
      couponGeneration: getValue(formData, "couponGeneration").trim(),
    },
  };

  if (campaignId) {
    const existing = await prisma.promotionCampaign.findFirst({
      where: { id: campaignId, storeId: context.store.id },
      select: { id: true },
    });

    if (!existing) {
      return result("error", "Promoção não encontrada.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.promotionProduct.deleteMany({ where: { campaignId } });
      await tx.promotionCategory.deleteMany({ where: { campaignId } });
      await tx.promotionCampaign.update({
        where: { id: campaignId },
        data: {
          ...data,
          products: { create: productConnect.map((productId) => ({ productId })) },
          categories: { create: categoryConnect.map((categoryId) => ({ categoryId })) },
        },
      });
      await upsertSingleCoupon(tx, context.store.id, campaignId, couponCode, couponMaxUses);
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const campaign = await tx.promotionCampaign.create({
        data: {
          ...data,
          products: { create: productConnect.map((productId) => ({ productId })) },
          categories: { create: categoryConnect.map((categoryId) => ({ categoryId })) },
        },
        select: { id: true },
      });
      await upsertSingleCoupon(tx, context.store.id, campaign.id, couponCode, couponMaxUses);
    });
  }

  revalidatePromotions(context.store.subdomain);
  return result("success", campaignId ? "Promoção atualizada com sucesso." : "Promoção criada com sucesso.");
}

export async function togglePromotionCampaignAction(campaignId: string): Promise<PromotionActionResult> {
  const context = await getPromotionContext();
  const campaign = await prisma.promotionCampaign.findFirst({
    where: { id: campaignId, storeId: context.store.id },
    select: { active: true },
  });

  if (!campaign) {
    return result("error", "Promoção não encontrada.");
  }

  await prisma.promotionCampaign.update({
    where: { id: campaignId },
    data: { active: !campaign.active },
  });

  revalidatePromotions(context.store.subdomain);
  return result("success", campaign.active ? "Promoção desativada." : "Promoção ativada.");
}

export async function deletePromotionCampaignAction(campaignId: string): Promise<PromotionActionResult> {
  const context = await getPromotionContext();
  const deleted = await prisma.promotionCampaign.deleteMany({
    where: { id: campaignId, storeId: context.store.id },
  });

  if (deleted.count === 0) {
    return result("error", "Promoção não encontrada.");
  }

  revalidatePromotions(context.store.subdomain);
  return result("success", "Promoção excluída com sucesso.");
}

export async function generatePromotionCouponsAction(
  campaignId: string,
  formData: FormData,
): Promise<PromotionActionResult> {
  const context = await getPromotionContext();
  const campaign = await prisma.promotionCampaign.findFirst({
    where: {
      id: campaignId,
      storeId: context.store.id,
    },
    select: { id: true },
  });

  if (!campaign) {
    return result("error", "Promoção não encontrada.");
  }

  const mode = getValue(formData, "mode");
  const quantity = Math.max(parseOptionalInt(getValue(formData, "quantity")) ?? 1, 1);
  const maxUses = parseOptionalInt(getValue(formData, "maxUses"));
  const codes = buildCouponCodes(mode, quantity, getValue(formData, "code"), getValue(formData, "manualCodes"));

  if (codes.length === 0) {
    return result("error", "Informe ao menos um código de cupom.");
  }

  try {
    await prisma.promotionCoupon.createMany({
      data: codes.map((code) => ({
        storeId: context.store.id,
        campaignId,
        code,
        maxUses,
      })),
      skipDuplicates: true,
    });
  } catch {
    return result("error", "Não foi possível gerar os cupons. Verifique se os códigos já existem.");
  }

  revalidatePromotions(context.store.subdomain);
  return result("success", `${codes.length} cupom(ns) gerado(s) com sucesso.`);
}

async function getPromotionContext() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    throw new Error("Loja não encontrada.");
  }

  await requireStorePermission(user.id, store.id, "promocoes");
  return { user, store };
}

async function validateProducts(storeId: string, productIds: string[]) {
  if (productIds.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: { storeId, id: { in: productIds } },
    select: { id: true },
  });

  return products.map((product) => product.id);
}

async function validateCategories(storeId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) {
    return [];
  }

  const categories = await prisma.category.findMany({
    where: { storeId, id: { in: categoryIds } },
    select: { id: true },
  });

  return categories.map((category) => category.id);
}

function buildCouponCodes(mode: string, quantity: number, code: string, manualCodes: string) {
  if (mode === "same") {
    return normalizeCodes([code]);
  }

  if (mode === "manual") {
    return normalizeCodes(manualCodes.split(/[\n,;]/g));
  }

  return normalizeCodes(Array.from({ length: quantity }, () => randomCouponCode()));
}

function normalizeCodes(codes: string[]) {
  return [...new Set(codes.map(sanitizeCouponCode).filter(Boolean))];
}

async function upsertSingleCoupon(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  storeId: string,
  campaignId: string,
  couponCode: string,
  maxUses: number | null,
) {
  if (!couponCode) {
    return;
  }

  const existingCoupon = await tx.promotionCoupon.findFirst({
    where: { campaignId },
    select: { id: true },
  });

  if (existingCoupon) {
    await tx.promotionCoupon.update({
      where: { id: existingCoupon.id },
      data: {
        code: couponCode,
        maxUses,
        active: true,
      },
    });
    return;
  }

  await tx.promotionCoupon.create({
    data: {
      storeId,
      campaignId,
      code: couponCode,
      maxUses,
    },
  });
}

function randomCouponCode() {
  return sanitizeCouponCode(`PROMO${Math.random().toString(36).slice(2, 8)}`);
}

function sanitizeCouponCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function revalidatePromotions(storeSlug: string) {
  revalidatePath("/dashboard/configuracoes/promocoes-descontos");
  revalidatePath(`/store/${storeSlug}`);
  revalidatePath(`/store/${storeSlug}/checkout`);
}

function getEnumValue<T extends string>(formData: FormData, key: string, values: Set<T>) {
  const value = getValue(formData, key) as T;
  return values.has(value) ? value : null;
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getAllValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && Boolean(value));
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseOptionalMoney(value: string) {
  const parsed = parseMoney(value);
  return parsed > 0 ? parsed : null;
}

function parseOptionalInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateTime(date: string, time: string) {
  if (!date) {
    return null;
  }

  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function result(type: PromotionActionResult["type"], message: string): PromotionActionResult {
  return { type, message };
}

