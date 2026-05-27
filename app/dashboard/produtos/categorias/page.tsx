import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./category-manager";

type RawCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  googleShoppingCategory: string | null;
  active: boolean;
  featured: boolean;
  showContent: boolean;
  parentId: string | null;
};

type CategoryTreeNode = RawCategory & {
  children: CategoryTreeNode[];
};

export default async function ProductCategoriesPage() {
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

  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      googleShoppingCategory: true,
      active: true,
      featured: true,
      showContent: true,
      parentId: true,
    },
  });

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Listagem de Categorias</span>
      </div>

      <CategoryManager
        categories={buildCategoryTree(categories)}
        storeUrl={`https://${store.subdomain}.lojavendora.com.br`}
      />
    </DashboardShell>
  );
}

function buildCategoryTree(categories: RawCategory[]) {
  const categoryMap = new Map<string, CategoryTreeNode>();

  for (const category of categories) {
    categoryMap.set(category.id, { ...category, children: [] });
  }

  const rootCategories: CategoryTreeNode[] = [];

  for (const category of categoryMap.values()) {
    if (category.parentId && categoryMap.has(category.parentId)) {
      categoryMap.get(category.parentId)?.children.push(category);
      continue;
    }

    rootCategories.push(category);
  }

  return rootCategories;
}
