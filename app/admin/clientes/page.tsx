import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ClientTable } from "@/components/admin/client-table";
import {
  clientStatuses,
  getActivePlans,
  getAdminClients,
  getClientStatusLabel,
} from "@/lib/admin-clients";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const clients = await getAdminClients({
    query: filters.q,
    status: filters.status,
  });
  const plans = await getActivePlans();
  const planOptions = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
  }));

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-[#17293f]">Cadastro</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Clientes e lojistas
          </h1>
        </div>
        <Link
          href="/admin/clientes/novo"
          className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]"
        >
          Novo cliente
        </Link>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-4xl font-black tracking-tight">Base de clientes</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Consulte lojistas cadastrados, status financeiro, plano contratado,
          loja vinculada e data de vencimento.
        </p>
      </section>

      <form className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px_auto]">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Buscar por nome, e-mail ou loja"
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#17293f]"
        />
        <select
          name="status"
          defaultValue={filters.status}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-[#17293f]"
        >
          <option value="">Todos os status</option>
          {clientStatuses.map((status) => (
            <option key={status} value={status}>
              {getClientStatusLabel(status)}
            </option>
          ))}
        </select>
        <button className="rounded-2xl bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]">
          Filtrar
        </button>
      </form>

      <div className="mt-8">
        <ClientTable clients={clients} plans={planOptions} />
      </div>
    </AdminShell>
  );
}
