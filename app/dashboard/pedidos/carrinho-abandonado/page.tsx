import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

const allowedPlanSlugs = ["loja-mais", "loja-completa", "loja-ilimitada"];

export default async function AbandonedCartPage() {
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

  const subscription = await prisma.subscription.findFirst({
    where: {
      storeId: store.id,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      plan: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
  const planSlug = subscription?.plan.slug ?? "loja-gratis";
  const canAccess = allowedPlanSlugs.includes(planSlug);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">
          Listagem de Carrinhos Abandonados
        </span>
      </div>

      {canAccess ? (
        <UnlockedAbandonedCart planName={subscription?.plan.name ?? "Loja Mais"} />
      ) : (
        <LockedAbandonedCart planName={subscription?.plan.name ?? "Loja Grátis"} />
      )}
    </DashboardShell>
  );
}

function LockedAbandonedCart({ planName }: { planName: string }) {
  return (
    <section className="relative overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
      <span className="absolute left-[-42px] top-10 z-10 -rotate-45 bg-red-600 px-12 py-3 text-xs font-black uppercase tracking-wide text-white shadow">
        Opção bloqueada
      </span>

      <div className="grid gap-8 p-8 md:grid-cols-[1fr_1.1fr] md:items-center lg:px-16">
        <div className="grid min-h-56 place-items-center">
          <div className="relative text-center">
            <div className="text-8xl">🛒</div>
            <p className="mt-4 text-sm font-bold text-slate-400">
              Plano atual: {planName}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Carrinho abandonado
          </p>
          <p className="mt-2 text-sm font-bold text-cyan-700">
            Exclusivo para planos Loja Mais ou superior
          </p>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
            Recupere os clientes que abandonaram o carrinho de compras com
            produtos e não finalizaram o pedido em sua loja, através de envios
            de e-mails automáticos e personalizados. Essa é uma ótima ferramenta
            para alavancar as suas vendas.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Traga de volta seus quase-clientes e aumente o seu faturamento!
          </p>
          <Link
            href="/admin/planos"
            className="mt-6 block w-full max-w-xl rounded bg-sky-600 px-6 py-4 text-center text-sm font-black uppercase text-white shadow-sm transition hover:bg-sky-700"
          >
            Aumentar meu plano
          </Link>
        </div>
      </div>
    </section>
  );
}

function UnlockedAbandonedCart({ planName }: { planName: string }) {
  return (
    <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-[#dddddd] px-5 py-4">
        <h1 className="font-bold text-slate-700">Carrinho Abandonado</h1>
      </header>
      <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
        <div>
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-cyan-50 text-5xl">
            🛒
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-800">
            Recurso liberado para seu plano
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Seu plano atual é <strong>{planName}</strong>. A listagem e
            automações de recuperação de carrinho serão exibidas aqui quando a
            captura de carrinhos da loja for ativada.
          </p>
        </div>
      </div>
    </section>
  );
}
