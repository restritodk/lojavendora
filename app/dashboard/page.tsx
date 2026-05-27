import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { formatPlatformCurrency } from "@/lib/platform-billing";
import { getStorePlanUsage, type PlanUsageItem } from "@/lib/plan-limits";
import { vendoraPlans } from "@/lib/plans";
import { requireStorePermission } from "@/lib/store-permissions";

export default async function DashboardPage() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  if (store) {
    await requireStorePermission(user.id, store.id, "dashboard");
  }
  const planUsage = store ? await getStorePlanUsage(store.id) : null;
  const shouldShowUpgrade = Boolean(planUsage && !planUsage.isUnlimited && (planUsage.isFreePlan || planUsage.alerts.length > 0));
  const greeting = getGreeting();

  return (
    <DashboardShell description="Painel do lojista">
      <header className="max-w-3xl rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#17293f] text-lg font-black text-white">
            {(store?.name ?? user.name ?? "L").charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                {store ? `${store.subdomain}.lojavendora.com.br` : "lojavendora.com.br"}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                {store?.name ?? "Sua loja"}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              {greeting}, {user.name ?? "lojista"}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Acompanhe pedidos, produtos e clientes em um painel centralizado.
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-400">{user.email}</p>
          </div>
        </div>
      </header>

      {planUsage ? (
        <MyPlanSection
          planUsage={planUsage}
          shouldShowUpgrade={shouldShowUpgrade}
        />
      ) : null}

      {shouldShowUpgrade ? (
        <FreePlanUpgrade storeName={store?.name ?? "sua loja"} />
      ) : null}
    </DashboardShell>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 0 && hour < 5) {
    return "Boa madrugada";
  }

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatSubscriptionStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    TRIALING: "Teste",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelado",
    EXPIRED: "Vencido",
  };

  return labels[status] ?? status;
}

const upgradeReviews = [
  {
    name: "Mariana Ribeiro",
    role: "Loja de Moda",
    text: "A Vendora ajudou minha loja a ficar com aparência profissional e pronta para vender. O suporte deixou tudo mais simples.",
  },
  {
    name: "Carlos Andrade",
    role: "Eletrônicos",
    text: "Comecei no plano grátis e fiz upgrade quando precisei de mais produtos. A criação da loja pela equipe economizou tempo.",
  },
  {
    name: "Fernanda Lopes",
    role: "Beleza e Cosméticos",
    text: "Os clientes passaram mais confiança depois que a loja ganhou um visual mais completo e organizado.",
  },
  {
    name: "Ricardo Silva",
    role: "Casa e Decoração",
    text: "Para quem quer vender online sem complicar, os planos pagos ajudam muito com estrutura e recursos.",
  },
];

function MyPlanSection({
  planUsage,
  shouldShowUpgrade,
}: {
  planUsage: Awaited<ReturnType<typeof getStorePlanUsage>>;
  shouldShowUpgrade: boolean;
}) {
  const plan = planUsage.plan;

  if (!plan) {
    return (
      <section className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <h2 className="text-xl font-black">Meu Plano</h2>
        <p className="mt-2 text-sm font-semibold">Loja sem plano ativo. Escolha um plano para liberar o painel.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-700">Meu Plano</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{plan.name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Status: <strong className="text-slate-700">{formatSubscriptionStatus(planUsage.subscription?.status ?? "EXPIRED")}</strong>
            {planUsage.expiresAt ? (
              <> • Vence em <strong className="text-slate-700">{formatDate(planUsage.expiresAt)}</strong></>
            ) : (
              <> • <strong className="text-slate-700">Sem vencimento</strong></>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-500">Mensalidade</p>
          <p className="text-2xl font-black text-emerald-600">
            {formatPlatformCurrency(plan.promotionalPrice ?? plan.price)}
          </p>
          {planUsage.daysRemaining !== null ? (
            <p className="mt-1 text-xs font-bold text-slate-500">
              {Math.max(planUsage.daysRemaining, 0)} dia(s) restantes
            </p>
          ) : null}
        </div>
      </div>

      {planUsage.alerts.length ? (
        <div className="mt-5 grid gap-3">
          {planUsage.alerts.map((alert) => (
            <div key={`${alert.type}-${alert.title}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-800">{alert.title}</p>
              <p className="mt-1 text-sm font-semibold text-amber-700">{alert.message}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {planUsage.limits.map((limit) => (
          <PlanUsageCard key={limit.key} limit={limit} isUnlimited={planUsage.isUnlimited} />
        ))}
      </div>

      {shouldShowUpgrade ? (
        <a
          href="#planos-upgrade"
          className="mt-6 inline-flex rounded-full bg-[#17293f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]"
        >
          Alterar Plano
        </a>
      ) : null}
    </section>
  );
}

function PlanUsageCard({
  limit,
  isUnlimited,
}: {
  limit: PlanUsageItem;
  isUnlimited: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-black text-slate-800">{limit.label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        {formatNumber(limit.used)} / {isUnlimited || limit.limit === null ? "Ilimitado" : formatNumber(limit.limit)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${limit.reached ? "bg-red-500" : limit.near ? "bg-amber-500" : "bg-cyan-500"}`}
          style={{ width: isUnlimited || limit.limit === null ? "100%" : `${limit.percentage}%` }}
        />
      </div>
      {limit.limit !== null && !isUnlimited ? (
        <p className="mt-2 text-xs font-bold text-slate-400">{limit.percentage}% utilizado</p>
      ) : null}
    </article>
  );
}

function FreePlanUpgrade({ storeName }: { storeName: string }) {
  const paidPlans = vendoraPlans.filter((plan) => plan.price > 0);

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-100 text-slate-950">
      <div className="grid gap-8 bg-white p-6 lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
        <div className="relative min-h-72 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-cyan-100 via-violet-100 to-amber-100 p-8">
          <div className="absolute -bottom-10 -left-10 size-48 rounded-full bg-cyan-300/50" />
          <div className="absolute -right-8 top-8 size-32 rounded-full bg-amber-300/60" />
          <div className="relative grid h-full place-items-center text-center">
            <div className="grid size-40 place-items-center rounded-full bg-white shadow-2xl">
              <span className="text-7xl">🚀</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600">
            Sua conta grátis está ativa
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">
            Ative um plano e vamos criar sua loja virtual!
          </h2>
          <p className="mt-5 max-w-2xl leading-7 text-slate-600">
            A loja <strong>{storeName}</strong> já pode começar no plano grátis.
            Ao ativar um plano pago, nossa equipe entra em contato para ajudar na
            configuração, personalização e estrutura completa da sua loja.
          </p>
          <a
            href="#planos-upgrade"
            className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-emerald-500 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:bg-emerald-600"
          >
            <span>✓</span>
            Ativar plano
          </a>
        </div>
      </div>

      <div className="px-6 py-10 lg:px-8">
        <h3 className="text-center text-3xl font-black">Veja o que dizem...</h3>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {upgradeReviews.map((review) => (
            <article key={review.name} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-amber-400">★★★★★</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {review.text}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black">{review.name}</p>
                  <p className="text-xs text-slate-500">{review.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Avaliações demonstrativas. Depois podemos conectar avaliações reais do
          Google e depoimentos dos seus clientes.
        </p>
      </div>

      <div id="planos-upgrade" className="px-6 pb-12 lg:px-8">
        <div className="text-center">
          <h3 className="text-3xl font-black">
            Escolha o plano que melhor se adequa ao seu negócio
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            A partir do plano pago, sua loja ganha mais limite, recursos e apoio
            para ficar pronta com mais velocidade.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-4">
          {paidPlans.map((plan) => (
            <article
              key={plan.slug}
              className={`relative rounded-3xl border bg-white p-6 text-center shadow-sm ${
                plan.highlighted
                  ? "border-amber-300 ring-2 ring-amber-300"
                  : "border-slate-200"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-black text-slate-950">
                  Recomendado
                </span>
              ) : null}
              <h4 className="text-xl font-black">{plan.name}</h4>
              <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              <p className="mt-5 text-2xl font-black text-emerald-600">
                {plan.priceLabel}
              </p>
              <div className="mt-6 grid gap-3 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <p key={feature}>✓ {feature}</p>
                ))}
              </div>
              <button className="mt-8 rounded-full border border-emerald-500 px-5 py-3 text-sm font-black text-emerald-600 transition hover:bg-emerald-500 hover:text-white">
                Adquirir já
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-10 text-center lg:px-8">
        <h3 className="text-3xl font-black">Seu sucesso online começa agora!</h3>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Continue usando sua conta grátis ou ative um plano para receber apoio
          na criação da loja, mais recursos e limites maiores para crescer.
        </p>
        <a
          href="#planos-upgrade"
          className="mt-8 inline-flex rounded-full bg-emerald-500 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:bg-emerald-600"
        >
          ✓ Ative sua loja agora!
        </a>
      </div>
    </section>
  );
}
