import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { PromotionsDiscountsPanel } from "./promotions-discounts-panel";

export default async function PromotionsDiscountsPage() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }

  await requireStorePermission(user.id, store.id, "promocoes");

  const [campaigns, products, categories] = await Promise.all([
    prisma.promotionCampaign.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
        },
        coupons: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            active: true,
            maxUses: true,
            usedCount: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        customCode: true,
      },
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Promoções e Descontos</span>
      </div>

      <PromotionsDiscountsPanel
        campaigns={campaigns.map((campaign) => ({
          id: campaign.id,
          type: campaign.type,
          name: campaign.name,
          active: campaign.active,
          discountType: campaign.discountType,
          discountValue: campaign.discountValue.toString(),
          minOrderValue: campaign.minOrderValue?.toString() ?? null,
          minQuantity: campaign.minQuantity,
          startsAt: campaign.startsAt?.toISOString() ?? null,
          endsAt: campaign.endsAt?.toISOString() ?? null,
          availableFor: normalizeStringArray(campaign.availableFor),
          scope: campaign.scope,
          productIds: campaign.products.map((item) => item.productId),
          categoryIds: campaign.categories.map((item) => item.categoryId),
          products: campaign.products.map((item) => item.product.name),
          categories: campaign.categories.map((item) => item.category.name),
          coupons: campaign.coupons,
          createdAt: campaign.createdAt.toISOString(),
        }))}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price.toString(),
          stock: product.stock,
          customCode: product.customCode,
        }))}
        categories={categories}
      />
    </DashboardShell>
  );
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

