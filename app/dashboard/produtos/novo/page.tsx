import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UpgradePlanCard } from "@/components/dashboard/upgrade-plan-card";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { canCreateProduct } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "./product-form";

export default async function NewProductPage() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const [categories, productLimit] = store
    ? await Promise.all([
        prisma.category.findMany({
          where: { storeId: store.id },
          orderBy: [{ parentId: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        }),
        canCreateProduct(store.id),
      ])
    : [[], { allowed: false, reason: "Loja não encontrada." }];

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span>Listagem de Produtos</span>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Adicionar Produto</span>
      </div>

      {productLimit.allowed ? (
        <ProductForm categories={categories} />
      ) : (
        <UpgradePlanCard
          title="Limite de produtos atingido"
          description={productLimit.reason ?? "Você atingiu o limite do seu plano. Faça upgrade para continuar adicionando produtos."}
          requiredPlan="Loja Inicial"
          benefits={[
            "Mais produtos cadastrados",
            "Mais visualizações mensais",
            "Recursos avançados para sua loja",
          ]}
        />
      )}
    </DashboardShell>
  );
}
