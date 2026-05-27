import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { requireStorePermission } from "@/lib/store-permissions";
import {
  formatCurrency,
  getReportData,
  type ReportRow,
  type ReportSearchParams,
} from "./report-data";
import { ReportsExportButton } from "./reports-export-button";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams>;
}) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const params = await searchParams;

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }

  await requireStorePermission(user.id, store.id, "relatorios");

  const { period, report } = await getReportData({
    storeId: store.id,
    storeName: store.name,
    storeLogoUrl: store.logoUrl,
    userEmail: user.email,
    params,
  });

  return (
    <DashboardShell description="Painel do lojista">
      <div className="report-page">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500 print:hidden">
          <Link href="/dashboard" className="transition hover:text-[#17293f]">
            Início
          </Link>
          <span>/</span>
          <span className="font-bold text-cyan-700">Relatórios</span>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600 print:text-slate-500">
                Relatórios
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Resumo da loja</h1>
              <p className="mt-2 text-sm text-slate-500">
                Selecione o período para visualizar vendas, produtos, clientes, envios e pagamentos.
              </p>
            </div>
            <ReportsExportButton start={period.startInput} end={period.endInput} />
          </div>

          <form className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:hidden md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-600">Data inicial</span>
              <input
                type="date"
                name="start"
                defaultValue={period.startInput}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-600">Data final</span>
              <input
                type="date"
                name="end"
                defaultValue={period.endInput}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <button
              type="submit"
              className="self-end rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              Filtrar
            </button>
          </form>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Pedidos realizados" value={String(report.ordersCount)} />
          <MetricCard label="Vendas concretizadas" value={String(report.completedOrdersCount)} />
          <MetricCard label="Total em vendas" value={formatCurrency(report.totalSales)} />
          <MetricCard label="Ticket médio" value={formatCurrency(report.averageTicket)} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ReportInfoCard
            title="Informações da loja por período"
            rows={[
              { label: "Clientes cadastrados", value: String(report.customersCount) },
              { label: "Pedidos realizados", value: String(report.ordersCount) },
              { label: "Vendas concretizadas", value: String(report.completedOrdersCount) },
              { label: "Produtos cadastrados", value: String(report.productsCount) },
            ]}
          />
          <ReportInfoCard
            title="Relatórios financeiros por período"
            rows={[
              { label: "Média de vendas diária", value: formatCurrency(report.dailyAverage) },
              { label: "Média de lucro diária", value: formatCurrency(report.dailyProfitAverage) },
              { label: "Total em vendas", value: formatCurrency(report.totalSales) },
              { label: "Total de custo dos produtos", value: formatCurrency(report.totalCost) },
              { label: "Total dos valores de frete", value: formatCurrency(report.totalShipping) },
              { label: "Total de lucro", value: formatCurrency(report.totalProfit) },
            ]}
          />
        </div>

        <div className="mt-6 grid gap-5">
          <ReportTable
            title="Relatório de produtos na data"
            exportSection="products"
            period={period}
            headers={["Código", "Produto", "Pedidos", "Unidades", "Custo", "Total vendido"]}
            rows={report.productRows.map((row) => [
              row.code,
              row.name,
              String(row.orders),
              String(row.quantity),
              formatCurrency(row.cost),
              formatCurrency(row.total),
            ])}
          />
          <ReportTable
            title="Relatório de compras por cliente na data"
            exportSection="customers"
            period={period}
            headers={["Cliente", "E-mail", "Compras", "Total", "Média"]}
            rows={report.customerRows.map((row) => [
              row.name,
              row.email,
              String(row.orders),
              formatCurrency(row.total),
              formatCurrency(row.average),
            ])}
          />
          <ReportTable
            title="Relatório de formas de envio na data"
            exportSection="shipping"
            period={period}
            headers={["Forma de envio", "Número total", "Valor total"]}
            rows={report.shippingRows.map((row) => [
              row.name,
              String(row.count),
              formatCurrency(row.total),
            ])}
          />
          <ReportTable
            title="Relatório de formas de pagamento na data"
            exportSection="payments"
            period={period}
            headers={["Forma de pagamento", "Número total", "Valor total"]}
            rows={report.paymentRows.map((row) => [
              row.name,
              String(row.count),
              formatCurrency(row.total),
            ])}
          />
        </div>
      </div>
    </DashboardShell>
  );
}

function MetricCard({ label, value }: ReportRow) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <strong className="mt-3 block text-2xl font-black text-slate-950">{value}</strong>
    </div>
  );
}

function ReportInfoCard({
  title,
  rows,
}: {
  title: string;
  rows: ReportRow[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-900">{title}</h2>
      <div className="mt-5 grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
            <span className="text-slate-500">{row.label}</span>
            <strong className="text-right text-slate-900">{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportTable({
  title,
  exportSection,
  period,
  headers,
  rows,
}: {
  title: string;
  exportSection: "products" | "customers" | "shipping" | "payments";
  period: { startInput: string; endInput: string };
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="font-black text-slate-900">{title}</h2>
        <ReportsExportButton
          start={period.startInput}
          end={period.endInput}
          section={exportSection}
          compact
        />
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-5 py-3 font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="odd:bg-slate-50/70">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-5 py-3 text-slate-600">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-6 text-center text-slate-400" colSpan={headers.length}>
                  Nenhum dado encontrado no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
