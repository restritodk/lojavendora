import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { ThemeGallery } from "./theme-gallery";

export default async function StoreAppearancePage() {
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

  const templates = await prisma.storeTemplate.findMany({
    orderBy: [
      { businessCategory: { name: "asc" } },
      { name: "asc" },
    ],
    include: {
      businessCategory: {
        select: { name: true },
      },
    },
  });

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Aparência da Loja</span>
      </div>

      <ThemeGallery
        storePath={`/store/${store.subdomain}`}
        themes={templates.map((template) => ({
          id: template.id,
          name: template.name,
          slug: template.slug,
          description: template.description,
          businessCategoryName: template.businessCategory.name,
          primaryColor: template.primaryColor,
          secondaryColor: template.secondaryColor,
          accentColor: template.accentColor,
          bannerTitle: template.bannerTitle,
          bannerSubtitle: template.bannerSubtitle,
          defaultCategories: template.defaultCategories,
          isActive: store.storeTemplateId === template.id,
        }))}
      />
    </DashboardShell>
  );
}
