import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  formatDate,
  getAdminClientById,
  getClientStatus,
  getClientStatusLabel,
} from "@/lib/admin-clients";

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getAdminClientById(id);

  if (!client || client.role !== "USER") {
    notFound();
  }

  const store = client.stores[0];
  const subscription = store?.subscriptions[0];
  const status = getClientStatus(subscription?.currentPeriodEnd);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-[#17293f]">Cliente</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {client.name ?? "Cliente sem nome"}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/clientes"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#17293f]"
          >
            Voltar
          </Link>
          <Link
            href={`/admin/clientes/${client.id}/editar`}
            className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]"
          >
            Editar cliente
          </Link>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Dados do cliente</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Nome", client.name ?? "-"],
              ["E-mail", client.email],
              ["Loja", store?.name ?? "-"],
              ["Subdomínio", store ? `${store.subdomain}.lojavendora.com.br` : "-"],
              ["Plano", subscription?.plan.name ?? "Sem plano"],
              ["Status financeiro", getClientStatusLabel(status)],
              ["Vencimento", formatDate(subscription?.currentPeriodEnd)],
              ["Assinatura", subscription?.status ?? "-"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Resumo financeiro</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Plano atual</p>
              <p className="mt-2 text-2xl font-black">
                {subscription?.plan.name ?? "Sem plano"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Próximo vencimento</p>
              <p className="mt-2 text-2xl font-black">
                {formatDate(subscription?.currentPeriodEnd)}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </AdminShell>
  );
}
