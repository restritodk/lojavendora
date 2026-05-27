import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { SettingsShell } from "../settings-shell";

const allowedPlanSlugs = ["loja-mais", "loja-completa", "loja-ilimitada"];

export default async function EmailSettingsPage() {
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
        select: { name: true, slug: true },
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
        <span className="font-bold text-cyan-700">Envio de E-mails</span>
      </div>

      <SettingsShell active="emails">
        {canAccess ? (
          <UnlockedEmails planName={subscription?.plan.name ?? "Loja Mais"} />
        ) : (
          <LockedEmails planName={subscription?.plan.name ?? "Loja Grátis"} />
        )}
      </SettingsShell>
    </DashboardShell>
  );
}

function LockedEmails({ planName }: { planName: string }) {
  return (
    <section className="relative overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
      <span className="absolute left-[-42px] top-10 z-10 -rotate-45 bg-red-600 px-12 py-3 text-xs font-black uppercase tracking-wide text-white shadow">
        Opção bloqueada
      </span>

      <div className="grid gap-8 p-8 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:px-16">
        <div className="grid min-h-56 place-items-center">
          <div className="text-center">
            <div className="text-8xl">✉️</div>
            <p className="mt-4 text-sm font-bold text-slate-400">
              Plano atual: {planName}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Envio de e-mails
          </p>
          <p className="mt-2 text-sm font-bold text-cyan-700">
            Exclusivo para planos Loja Mais ou superior
          </p>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
            Automatize mensagens enviadas aos compradores, como confirmação de
            pedido, pagamento aprovado, envio, recuperação de carrinho e outros
            avisos importantes da loja.
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

function UnlockedEmails({ planName }: { planName: string }) {
  return (
    <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-[#dddddd] px-5 py-4">
        <span className="text-xl">✉️</span>
        <h1 className="font-bold text-slate-700">Envio de E-mails</h1>
      </header>
      <div className="grid gap-5 p-5">
        <div className="border-l-4 border-cyan-500 bg-slate-50 px-5 py-4 text-sm text-slate-500">
          Configure automações de e-mail para manter seus compradores
          informados durante cada etapa da compra.
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Confirmação de pedido",
            "Pagamento aprovado",
            "Pedido enviado",
            "Pedido entregue",
            "Carrinho abandonado",
            "Newsletter",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-black text-slate-800">{item}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Recurso liberado para o plano {planName}. A configuração
                detalhada será exibida aqui.
              </p>
              <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Recurso ativo
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
