import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { SettingsShell } from "../settings-shell";
import { GeneralSettingsForm } from "./general-settings-form";

export default async function GeneralSettingsPage() {
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

  await requireStorePermission(user.id, store.id, "configuracoes");

  const banners = await prisma.storeBanner.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      imageUrl: true,
      title: true,
      active: true,
      sortOrder: true,
    },
  });

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Configurações Gerais</span>
      </div>

      <SettingsShell active="gerais">
        <GeneralSettingsForm
          store={{
            name: store.name,
            subdomain: store.subdomain,
            active: store.active,
            logoUrl: store.logoUrl,
            banners,
          }}
        />
      </SettingsShell>
    </DashboardShell>
  );
}
