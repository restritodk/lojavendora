import { PromotionCampaignType, PromotionDiscountType, PromotionScope } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PromotionCheckoutItem = {
  productId: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PromotionCalculationInput = {
  storeId: string;
  customerPersonType?: string | null;
  items: PromotionCheckoutItem[];
  subtotal: number;
  couponCode?: string | null;
};

export type AppliedPromotion = {
  campaignId: string;
  campaignName: string;
  type: PromotionCampaignType;
  couponId?: string;
  couponCode?: string;
  discount: number;
};

export type PromotionCalculationResult = {
  discount: number;
  appliedPromotions: AppliedPromotion[];
  couponError?: string;
};

type CampaignWithRelations = Awaited<ReturnType<typeof getActiveCampaigns>>[number];

export async function calculatePromotionsForCheckout({
  storeId,
  customerPersonType,
  items,
  subtotal,
  couponCode,
}: PromotionCalculationInput): Promise<PromotionCalculationResult> {
  const campaigns = await getActiveCampaigns(storeId);
  const automaticPromotions = campaigns
    .filter((campaign) => campaign.type !== PromotionCampaignType.COUPON)
    .flatMap((campaign) => calculateCampaignDiscount(campaign, items, subtotal, customerPersonType));
  const bestOrderDiscount = bestPromotionOfType(automaticPromotions, PromotionCampaignType.ORDER_VALUE_DISCOUNT);
  const bestWholesaleDiscount = bestPromotionOfType(automaticPromotions, PromotionCampaignType.WHOLESALE_RETAIL);
  const appliedPromotions = [bestOrderDiscount, bestWholesaleDiscount].filter(
    (promotion): promotion is AppliedPromotion => Boolean(promotion),
  );
  const normalizedCoupon = couponCode?.trim().toUpperCase();

  if (normalizedCoupon) {
    const couponPromotion = calculateCouponDiscount(campaigns, normalizedCoupon, items, subtotal, customerPersonType);

    if (couponPromotion.promotion) {
      appliedPromotions.push(couponPromotion.promotion);
    } else {
      return {
        discount: sumDiscounts(appliedPromotions, subtotal),
        appliedPromotions,
        couponError: couponPromotion.error ?? "Cupom inválido ou expirado.",
      };
    }
  }

  return {
    discount: sumDiscounts(appliedPromotions, subtotal),
    appliedPromotions,
  };
}

export async function incrementCouponUsage(couponIds: string[]) {
  if (couponIds.length === 0) {
    return;
  }

  await prisma.promotionCoupon.updateMany({
    where: { id: { in: couponIds } },
    data: { usedCount: { increment: 1 } },
  });
}

async function getActiveCampaigns(storeId: string) {
  const now = new Date();

  return prisma.promotionCampaign.findMany({
    where: {
      storeId,
      active: true,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
      ],
    },
    include: {
      products: { select: { productId: true } },
      categories: { select: { categoryId: true } },
      coupons: {
        where: { active: true },
        select: {
          id: true,
          code: true,
          maxUses: true,
          usedCount: true,
        },
      },
    },
  });
}

function calculateCampaignDiscount(
  campaign: CampaignWithRelations,
  items: PromotionCheckoutItem[],
  subtotal: number,
  customerPersonType?: string | null,
) {
  if (!isCampaignAvailableForCustomer(campaign.availableFor, customerPersonType)) {
    return [];
  }

  if (campaign.type === PromotionCampaignType.ORDER_VALUE_DISCOUNT) {
    const minOrderValue = numberOrNull(campaign.minOrderValue);

    if (minOrderValue !== null && subtotal < minOrderValue) {
      return [];
    }

    return [toAppliedPromotion(campaign, calculateDiscount(subtotal, campaign.discountType, Number(campaign.discountValue)))];
  }

  const eligibleItems = filterEligibleItems(campaign, items);
  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.total, 0);
  const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

  if (eligibleSubtotal <= 0) {
    return [];
  }

  if (campaign.minQuantity && eligibleQuantity < campaign.minQuantity) {
    return [];
  }

  return [toAppliedPromotion(campaign, calculateDiscount(eligibleSubtotal, campaign.discountType, Number(campaign.discountValue)))];
}

function calculateCouponDiscount(
  campaigns: CampaignWithRelations[],
  couponCode: string,
  items: PromotionCheckoutItem[],
  subtotal: number,
  customerPersonType?: string | null,
) {
  const campaign = campaigns.find((item) =>
    item.coupons.some((coupon) => coupon.code.toUpperCase() === couponCode),
  );

  if (!campaign) {
    return { error: "Cupom não encontrado." };
  }

  if (!isCampaignAvailableForCustomer(campaign.availableFor, customerPersonType)) {
    return { error: "Cupom não disponível para este tipo de cadastro." };
  }

  const coupon = campaign.coupons.find((item) => item.code.toUpperCase() === couponCode);

  if (!coupon) {
    return { error: "Cupom não encontrado." };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { error: "Cupom já atingiu o limite de uso." };
  }

  const minOrderValue = numberOrNull(campaign.minOrderValue);

  if (minOrderValue !== null && subtotal < minOrderValue) {
    return { error: `Cupom disponível apenas para compras a partir de ${formatCurrency(minOrderValue)}.` };
  }

  const eligibleItems = filterEligibleItems(campaign, items);
  const discountBase = campaign.scope === PromotionScope.ALL_PRODUCTS
    ? subtotal
    : eligibleItems.reduce((sum, item) => sum + item.total, 0);

  if (discountBase <= 0) {
    return { error: "Cupom não se aplica aos produtos do carrinho." };
  }

  return {
    promotion: toAppliedPromotion(
      campaign,
      calculateDiscount(discountBase, campaign.discountType, Number(campaign.discountValue)),
      {
        couponId: coupon.id,
        couponCode: coupon.code,
      },
    ),
  };
}

function filterEligibleItems(campaign: CampaignWithRelations, items: PromotionCheckoutItem[]) {
  if (campaign.scope === PromotionScope.ALL_PRODUCTS) {
    return items;
  }

  if (campaign.scope === PromotionScope.SELECTED_PRODUCTS) {
    const productIds = new Set(campaign.products.map((product) => product.productId));
    return items.filter((item) => productIds.has(item.productId));
  }

  const categoryIds = new Set(campaign.categories.map((category) => category.categoryId));
  return items.filter((item) => item.categoryId && categoryIds.has(item.categoryId));
}

function isCampaignAvailableForCustomer(value: unknown, customerPersonType?: string | null) {
  const availableFor = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  if (availableFor.length === 0) {
    return true;
  }

  const normalized = normalizePersonType(customerPersonType);
  return availableFor.includes(normalized);
}

function normalizePersonType(value?: string | null) {
  const normalized = value?.toUpperCase();
  return normalized === "JURIDICA" || normalized === "PESSOA JURÍDICA" || normalized === "Pessoa Jurídica"
    ? "Pessoa Jurídica"
    : "Pessoa Física";
}

function calculateDiscount(base: number, type: PromotionDiscountType, value: number) {
  if (base <= 0 || value <= 0) {
    return 0;
  }

  if (type === PromotionDiscountType.PERCENTAGE) {
    return roundMoney(Math.min(base, base * (value / 100)));
  }

  return roundMoney(Math.min(base, value));
}

function toAppliedPromotion(
  campaign: CampaignWithRelations,
  discount: number,
  coupon?: { couponId: string; couponCode: string },
): AppliedPromotion {
  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    type: campaign.type,
    discount,
    ...coupon,
  };
}

function bestPromotionOfType(promotions: AppliedPromotion[], type: PromotionCampaignType) {
  return promotions
    .filter((promotion) => promotion.type === type && promotion.discount > 0)
    .sort((a, b) => b.discount - a.discount)[0];
}

function sumDiscounts(promotions: AppliedPromotion[], subtotal: number) {
  return roundMoney(Math.min(subtotal, promotions.reduce((sum, promotion) => sum + promotion.discount, 0)));
}

function numberOrNull(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

