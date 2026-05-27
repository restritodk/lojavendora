import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { CustomerListActions } from "./customer-list-actions";

export default async function CustomerListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);
  if (store) {
    await requireStorePermission(user.id, store.id, "clientes");
  }
  const pageSize = 10;
  const where = store
    ? {
        storeId: store.id,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { document: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
                { accessEmail: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      }
    : undefined;

  const customers = store
    ? await prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { orders: true },
          },
        },
      })
    : [];
  const totalCustomers = where ? await prisma.customer.count({ where }) : 0;
  const totalPages = Math.max(Math.ceil(totalCustomers / pageSize), 1);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Listagem de Clientes</span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-black">Listagem de Clientes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Consulte compradores cadastrados na sua loja.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-slate-500 px-4 py-2 text-sm font-black text-white">
              Importar/Exportar Clientes
            </button>
            <Link
              href="/dashboard/clientes/novo"
              className="rounded-xl bg-[#17293f] px-4 py-2 text-sm font-black text-white"
            >
              + Adicionar Cliente
            </Link>
          </div>
        </header>

        <div className="border-b border-slate-200 px-5 py-4">
          {params.success ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              {params.success}
            </div>
          ) : null}
          {params.error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {params.error}
            </div>
          ) : null}

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex gap-6 text-sm font-bold">
              <span className="border-b-2 border-[#17293f] pb-2 text-[#17293f]">
                Listar Todos
              </span>
              <span className="pb-2 text-slate-400">Novos Clientes</span>
            </div>
            <form className="relative w-full max-w-sm">
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar por nome, CPF ou e-mail"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#17293f]"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto pb-12">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-5 py-4">
                  <input type="checkbox" className="accent-[#17293f]" />
                </th>
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">CPF/CNPJ</th>
                <th className="px-5 py-4">E-mail</th>
                <th className="px-5 py-4">Telefone</th>
                <th className="px-5 py-4">Cadastro</th>
                <th className="px-5 py-4">Pedidos</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-100 odd:bg-sky-50/50"
                  >
                    <td className="px-5 py-4">
                      <input type="checkbox" className="accent-[#17293f]" />
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#17293f]">
                      {customer.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {customer.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.document ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.email ?? customer.accessEmail ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.phone ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.createdAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer._count.orders}
                    </td>
                    <td className="px-5 py-4">
                      <CustomerListActions
                        customerId={customer.id}
                        customerName={customer.name}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center">
          <span>
            Mostrando {customers.length} de {totalCustomers} cliente(s)
          </span>
          <div className="flex items-center gap-2">
            <PaginationLink
              label="Anterior"
              page={Math.max(currentPage - 1, 1)}
              query={query}
              disabled={currentPage === 1}
            />
            <span className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>
            <PaginationLink
              label="Próxima"
              page={Math.min(currentPage + 1, totalPages)}
              query={query}
              disabled={currentPage >= totalPages}
            />
          </div>
        </footer>
      </section>
    </DashboardShell>
  );
}

function PaginationLink({
  label,
  page,
  query,
  disabled,
}: {
  label: string;
  page: number;
  query: string;
  disabled: boolean;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("page", String(page));

  if (disabled) {
    return (
      <span className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-300">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`/dashboard/clientes?${params.toString()}`}
      className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:border-[#17293f] hover:text-[#17293f]"
    >
      {label}
    </Link>
  );
}
