import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { ProductListTable } from "./product-list-table";

const PAGE_SIZE = 15;

const filters = [
  { id: "todos", label: "Listar Todos" },
  { id: "ativos", label: "Ativos" },
  { id: "lancamento", label: "Lançamento" },
  { id: "frete-gratis", label: "Frete Grátis" },
  { id: "estoque-baixo", label: "Estoque Baixo" },
  { id: "sem-estoque", label: "Sem Estoque" },
  { id: "desativados", label: "Desativados" },
  { id: "com-estoque", label: "Com estoque" },
] as const;

type ProductFilter = (typeof filters)[number]["id"];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filtro?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const params = await searchParams;
  const activeFilter = normalizeFilter(params.filtro);
  const search = params.q?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }

  await requireStorePermission(user.id, store.id, "produtos");

  const where = {
    storeId: store.id,
    ...filterWhere(activeFilter),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
            { customCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    }),
    prisma.product.count({ where }),
  ]);
  const totalPages = Math.max(Math.ceil(totalProducts / PAGE_SIZE), 1);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Listagem de Produtos</span>
      </div>

      <ProductListTable
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
          imageUrl: product.images[0]?.url ?? product.imageUrl,
          stock: product.stock,
          criticalStock: product.criticalStock,
          status: product.status,
          showOnSite: product.showOnSite,
          isLaunch: product.isLaunch,
          freightType: product.freightType,
          showOnHome: product.showOnHome,
          categoryName: product.category?.name ?? null,
          customCode: product.customCode,
          createdAt: product.createdAt.toISOString(),
        }))}
        filters={filters}
        activeFilter={activeFilter}
        search={search}
        currentPage={currentPage}
        totalPages={totalPages}
        totalProducts={totalProducts}
        storePath={`/store/${store.subdomain}`}
      />
    </DashboardShell>
  );
}

function normalizeFilter(filter?: string): ProductFilter {
  return filters.some((item) => item.id === filter)
    ? (filter as ProductFilter)
    : "todos";
}

function filterWhere(filter: ProductFilter) {
  switch (filter) {
    case "ativos":
      return { status: "ACTIVE" as const };
    case "lancamento":
      return { isLaunch: true };
    case "frete-gratis":
      return { freightType: "gratis" };
    case "estoque-baixo":
      return { stock: { lte: 5, gt: 0 } };
    case "sem-estoque":
      return { stock: { lte: 0 } };
    case "desativados":
      return { status: "INACTIVE" as const };
    case "com-estoque":
      return { stock: { gt: 0 }, showOnHome: true };
    case "todos":
    default:
      return {};
  }
}
