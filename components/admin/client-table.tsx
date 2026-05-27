import { ClientActionsModal } from "@/components/admin/client-actions-modal";
import type { ClientStatus } from "@/lib/admin-clients";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  storeName: string;
  subdomain: string;
  planName: string;
  planId: string;
  status: ClientStatus;
  statusLabel: string;
  dueDateLabel: string;
  dueDateInput: string;
};

type PlanOption = {
  id: string;
  name: string;
  price?: unknown;
};

type ClientTableProps = {
  clients: ClientRow[];
  plans: PlanOption[];
};

const statusClassName: Record<ClientStatus, string> = {
  isento: "bg-slate-100 text-slate-700",
  "em-dia": "bg-emerald-50 text-emerald-700",
  "a-vencer": "bg-amber-50 text-amber-700",
  vencido: "bg-orange-50 text-orange-700",
  inadimplente: "bg-red-50 text-red-700",
  vendido: "bg-cyan-50 text-cyan-700",
};

export function ClientTable({ clients, plans }: ClientTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1.1fr_1fr_1fr_0.9fr_0.9fr_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 lg:grid">
        <span>Cliente</span>
        <span>Loja</span>
        <span>Plano</span>
        <span>Status</span>
        <span>Vencimento</span>
        <span>Ações</span>
      </div>

      {clients.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          Nenhum cliente encontrado para os filtros selecionados.
        </div>
      ) : (
        clients.map((client) => (
          <div
            key={client.id}
            className="grid gap-4 border-b border-slate-200 px-5 py-5 text-sm last:border-0 lg:grid-cols-[1.1fr_1fr_1fr_0.9fr_0.9fr_120px]"
          >
            <div>
              <p className="font-bold text-slate-900">{client.name}</p>
              <p className="mt-1 text-slate-500">{client.email}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">{client.storeName}</p>
              <p className="mt-1 text-slate-500">
                {client.subdomain}.lojavendora.com.br
              </p>
            </div>
            <span className="font-semibold text-slate-700">{client.planName}</span>
            <span
              className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-black ${statusClassName[client.status]}`}
            >
              {client.statusLabel}
            </span>
            <span className="text-slate-600">{client.dueDateLabel}</span>
            <div>
              <ClientActionsModal client={client} plans={plans} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
