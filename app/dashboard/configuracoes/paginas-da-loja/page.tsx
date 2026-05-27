import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { SettingsShell } from "../settings-shell";
import { StorePagesPanel } from "./store-pages-panel";

export default async function StorePagesConfigPage() {
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

  const pages = await prisma.storePage.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      title: true,
      slug: true,
      description: true,
      content: true,
      active: true,
    },
  });

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Páginas da Loja</span>
      </div>

      <SettingsShell active="paginas">
        <StorePagesPanel
          storeSlug={store.subdomain}
          pages={pages}
          systemPages={getSystemPages(store.subdomain)}
        />
      </SettingsShell>
    </DashboardShell>
  );
}

function getSystemPages(storeSlug: string) {
  return [
    {
      code: 22,
      title: "Tela informativa exibida quando a loja está desativada",
      link: `/store/${storeSlug}`,
    },
    {
      code: 17,
      title: "Tela com as informações do pedido após a compra realizada",
      link: `/store/${storeSlug}/pedidos`,
    },
    {
      code: 16,
      title: "Tela com as informações do produto",
      link: `/store/${storeSlug}/produto/[produto]`,
    },
    {
      code: 15,
      title: "Tela de seleção de pagamento e envio do pedido",
      link: "/checkout/efetuar-pedido",
    },
    {
      code: 14,
      title: "Tela onde o cliente realiza login na loja",
      link: `/store/${storeSlug}/login`,
    },
  ];
}
