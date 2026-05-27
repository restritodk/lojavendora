import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { EditProductForm } from "./edit-product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    notFound();
  }

  const [product, categories, fixedFreightSetting] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id,
        storeId: store.id,
      },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    }),
    prisma.storeAdvancedSetting.findUnique({
      where: {
        storeId_featureId: {
          storeId: store.id,
          featureId: `product:${id}:fixed-freight`,
        },
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <Link href="/dashboard/produtos" className="transition hover:text-[#17293f]">
          Listagem de Produtos
        </Link>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Editar Produto</span>
      </div>

      <EditProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          price: formatDecimal(product.price),
          oldPrice: product.oldPrice ? formatDecimal(product.oldPrice) : "",
          costPrice: product.costPrice ? formatDecimal(product.costPrice) : "",
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          brand: product.brand ?? "",
          model: product.model ?? "",
          warranty: product.warranty ?? "",
          imageUrl: product.imageUrl ?? "",
          youtubeUrl: product.youtubeUrl ?? "",
          freightType: product.freightType ?? "correios",
          weight: product.weight ? String(product.weight) : "",
          height: product.height ? String(product.height) : "",
          width: product.width ? String(product.width) : "",
          length: product.length ? String(product.length) : "",
          declaredValue: product.declaredValue ? formatDecimal(product.declaredValue) : "",
          additionalFreight: product.additionalFreight ? formatDecimal(product.additionalFreight) : "",
          allowOutOfStock: product.allowOutOfStock,
          stock: product.stock,
          criticalStock: product.criticalStock,
          showOnSite: product.showOnSite,
          showOnHome: product.showOnHome,
          isLaunch: product.isLaunch,
          minQuantity: product.minQuantity,
          priority: product.priority ?? "",
          recommendedMode: product.recommendedMode ?? "nenhum",
          tags: product.tags ?? "",
          customCode: product.customCode ?? "",
          ageGroup: product.ageGroup ?? "todas",
          genderTarget: product.genderTarget ?? "todos",
          status: product.status,
          categoryId: product.categoryId ?? "",
          mainImageUrl: product.images[0]?.url ?? product.imageUrl,
          fixedFreightRules: parseFixedFreightRules(fixedFreightSetting?.values),
        }}
      />
    </DashboardShell>
  );
}

function parseFixedFreightRules(value: unknown) {
  if (!value || typeof value !== "object" || !("rules" in value)) {
    return [];
  }

  const rules = (value as { rules?: unknown }).rules;

  if (!Array.isArray(rules)) {
    return [];
  }

  return rules
    .map((rule) => {
      if (!rule || typeof rule !== "object") {
        return null;
      }

      const data = rule as Record<string, unknown>;
      return {
        state: String(data.state ?? ""),
        value: Number(data.value ?? 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        minDays: String(data.minDays ?? ""),
        maxDays: String(data.maxDays ?? ""),
      };
    })
    .filter((rule): rule is { state: string; value: string; minDays: string; maxDays: string } =>
      Boolean(rule?.state),
    );
}

function formatDecimal(value: unknown) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
