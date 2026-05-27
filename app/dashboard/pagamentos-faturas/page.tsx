import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import {
  formatPlatformCurrency,
  getPlatformBillingSummary,
} from "@/lib/platform-billing";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { BillingPaymentPanel } from "./billing-payment-panel";

export default async function MerchantBillingPage() {
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

  const [billing, subscriptionCheck] = await Promise.all([
    getPlatformBillingSummary(store.id),
    checkStoreSubscription(store.id),
  ]);
  const openInvoices = billing.invoices.filter((invoice) => invoice.status !== "PAID" && invoice.status !== "CANCELED");
  const paidInvoices = billing.invoices.filter((invoice) => invoice.status === "PAID");
  const overdueInvoices = billing.invoices.filter((invoice) => invoice.status === "OVERDUE");

  return (
    <DashboardShell description="Pagamentos e Faturas">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Pagamentos e Faturas</span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-600">
              Financeiro da plataforma
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Pagamentos e Faturas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Acompanhe a mensalidade da sua loja, limites do plano e pagamentos feitos para o proprietário da plataforma.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
            {store.name}
          </span>
        </div>
      </section>

      {subscriptionCheck.isInGracePeriod ? (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
          Seu plano está vencido. Você possui {subscriptionCheck.graceDaysRemaining} dia(s) para regularizar o pagamento antes do bloqueio da loja.
        </div>
      ) : null}
      {subscriptionCheck.isBlocked ? (
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          Seu painel e site estão bloqueados por inadimplência. Após o pagamento aprovado, tudo será reativado automaticamente.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">Resumo da loja</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {billing.subscription?.plan.name ?? "Sem plano ativo"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Status: <strong className="text-slate-700">{formatStatus(billing.subscription?.status ?? "EXPIRED")}</strong>
          </p>

          <div className="mt-6 grid gap-3">
            <UsageBar
              label="Produtos cadastrados"
              used={billing.usage.products.used}
              limit={billing.usage.products.limit}
            />
            <UsageBar
              label="Usuários do painel"
              used={billing.usage.users.used}
              limit={billing.usage.users.limit}
            />
            <UsageBar
              label="Visitas mensais"
              used={billing.usage.visits.used}
              limit={billing.usage.visits.limit}
            />
          </div>

          {billing.subscription ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Período atual: <strong>{formatDate(billing.subscription.currentPeriodStart)}</strong> até{" "}
                <strong>
                  {billing.subscription.currentPeriodEnd
                    ? formatDate(billing.subscription.currentPeriodEnd)
                    : "sem vencimento"}
                </strong>
              </p>
              <p className="mt-1">
                Mensalidade:{" "}
                <strong className="text-slate-800">
                  {formatPlatformCurrency(billing.subscription.plan.promotionalPrice ?? billing.subscription.plan.price)}
                </strong>
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">Mensalidades</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Faturas da plataforma</h2>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {openInvoices.length} em aberto
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {openInvoices.length ? (
              openInvoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} canPay />
              ))
            ) : (
              <EmptyState text="Nenhuma mensalidade em aberto." />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InvoiceList title="Mensalidades vencidas" invoices={overdueInvoices} empty="Nenhuma fatura vencida." />
        <InvoiceList title="Mensalidades pagas" invoices={paidInvoices} empty="Nenhuma fatura paga ainda." />
      </div>
    </DashboardShell>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percentage = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-slate-700">{label}</span>
        <span className="font-bold text-slate-500">
          {used} / {limit ?? "ilimitado"}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: limit ? `${percentage}%` : "100%" }} />
      </div>
    </div>
  );
}

function InvoiceList({
  title,
  invoices,
  empty,
}: {
  title: string;
  invoices: Array<InvoiceCardProps["invoice"]>;
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {invoices.length ? invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />) : <EmptyState text={empty} />}
      </div>
    </section>
  );
}

type InvoiceCardProps = {
  invoice: {
    id: string;
    referenceMonth: string;
    status: string;
    amount: unknown;
    dueDate: Date;
    paidAt: Date | null;
    plan: { name: string } | null;
  };
  canPay?: boolean;
};

function InvoiceCard({ invoice, canPay }: InvoiceCardProps) {
  const isPayable = canPay && invoice.status !== "PAID" && invoice.status !== "CANCELED";

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">
            {invoice.plan?.name ?? "Plano"} - {invoice.referenceMonth}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Vencimento: {formatDate(invoice.dueDate)}
            {invoice.paidAt ? ` • Pago em ${formatDate(invoice.paidAt)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-slate-950">{formatPlatformCurrency(invoice.amount)}</p>
          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${statusClass(invoice.status)}`}>
            {formatInvoiceStatus(invoice.status)}
          </span>
        </div>
      </div>
      {isPayable ? (
        <div className="mt-4">
          <BillingPaymentPanel invoiceId={invoice.id} />
        </div>
      ) : null}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRIALING: "Teste",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    EXPIRED: "Expirada",
  };

  return labels[status] ?? status;
}

function formatInvoiceStatus(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Em aberto",
    PAID: "Paga",
    OVERDUE: "Vencida",
    CANCELED: "Cancelada",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700";
  if (status === "OVERDUE") return "bg-red-50 text-red-700";
  if (status === "CANCELED") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}
