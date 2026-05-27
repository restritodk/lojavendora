import { AdminShell } from "@/components/admin/admin-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";

const platformMetrics = [
  { label: "Receita mensal", value: "R$ 42.800", change: "+18%" },
  { label: "Clientes ativos", value: "128", change: "+12" },
  { label: "A vencer", value: "17", change: "7 dias" },
  { label: "Inadimplentes", value: "4", change: "-2" },
];

const clients = [
  ["Luanna", "luanna@gmail.com", "Loja Ilimitada", "Em dia"],
  ["Aurora Moda", "financeiro@aurora.com", "Loja Mais", "A vencer"],
  ["Casa Viva", "contato@casaviva.com", "Loja Inicial", "Vendido"],
];

const financeRows = [
  ["MRR atual", "R$ 42.800", "Receita recorrente mensal"],
  ["Recebido no mês", "R$ 31.940", "Pagamentos confirmados"],
  ["Em aberto", "R$ 6.280", "Boletos/cartões pendentes"],
  ["Vencido", "R$ 1.196", "Clientes inadimplentes"],
];

export default async function AdminPage() {
  return (
    <AdminShell>
      <section id="dashboard">
          <div className="mb-8 flex flex-col justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-[#17293f]">Admin Master</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                Painel do proprietário
              </h1>
            </div>
            <div className="flex gap-3">
              <button className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#17293f]">
                Exportar relatório
              </button>
              <button className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]">
                Novo cliente
              </button>
            </div>
          </div>

          <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="max-w-4xl">
              <span className="rounded-full border border-[#17293f]/20 bg-[#17293f]/10 px-4 py-2 text-sm font-semibold text-[#17293f]">
                Operação Vendora
              </span>
              <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                Visão executiva da operação, clientes e financeiro.
              </h2>
              <p className="mt-4 max-w-2xl text-slate-600">
                Use este dashboard para acompanhar a saúde do negócio, clientes,
                vencimentos, inadimplência e receita da plataforma.
              </p>
            </div>
          </header>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {platformMetrics.map((metric) => (
              <SummaryCard key={metric.label} {...metric} />
            ))}
          </div>

          <section id="clientes" className="mt-8 grid gap-8 xl:grid-cols-[1fr_380px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-[#17293f]">
                    Cadastro
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Clientes da Vendora</h2>
                </div>
                <button id="novo-cliente" className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f1f31]">
                  Novo cliente
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {clients.map(([name, email, plan, status]) => (
                  <div
                    key={email}
                    className="grid gap-3 border-b border-slate-200 px-4 py-4 text-sm last:border-0 md:grid-cols-4"
                  >
                    <span className="font-bold">{name}</span>
                    <span className="text-slate-500">{email}</span>
                    <span className="text-slate-600">{plan}</span>
                    <span className="font-semibold text-emerald-700">{status}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Relatórios rápidos</h2>
              <div className="mt-6 grid gap-3">
                {["Clientes em dia", "A vencer", "Vendidos"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-semibold text-slate-600 transition hover:border-[#17293f]/40 hover:text-[#17293f]"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </aside>
          </section>

          <section id="financeiro" className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#17293f]">Financeiro</p>
              <h2 className="mt-2 text-2xl font-black">Visão financeira completa</h2>
              <p className="mt-2 text-sm text-slate-600">
                Base para acompanhar receitas, cobranças, inadimplência e
                repasses da plataforma.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {financeRows.map(([label, value, description]) => (
                <article
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-sm text-slate-500">{label}</p>
                  <strong className="mt-3 block text-2xl">{value}</strong>
                  <p className="mt-2 text-xs text-slate-500">{description}</p>
                </article>
              ))}
            </div>
          </section>

      </section>
    </AdminShell>
  );
}
