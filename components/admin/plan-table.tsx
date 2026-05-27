import { PlanTableActions } from "@/components/admin/plan-table-actions";
import { formatCurrency } from "@/lib/admin-plans";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  maxProducts: number | null;
  maxMonthlyVisits: number | null;
  maxOrders: number | null;
  maxStorageMb: number | null;
  maxUsers: number | null;
  isUnlimited: boolean;
  durationDays: number | null;
  releasedFeatures: string[];
  allowsCustomDomain: boolean;
  hasBasicFeatures: boolean;
  hasIntermediateFeatures: boolean;
  hasAdvancedFeatures: boolean;
  isActive: boolean;
  _count: {
    subscriptions: number;
  };
};

type PlanTableProps = {
  plans: PlanRow[];
};

export function PlanTable({ plans }: PlanTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1.1fr_0.8fr_1fr_0.8fr_0.8fr_170px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 xl:grid">
        <span>Plano</span>
        <span>Preço</span>
        <span>Limites</span>
        <span>Domínio</span>
        <span>Status</span>
        <span>Ações</span>
      </div>

      {plans.map((plan) => (
        <div
          key={plan.id}
          className="grid gap-4 border-b border-slate-200 px-5 py-5 text-sm last:border-0 xl:grid-cols-[1.1fr_0.8fr_1fr_0.8fr_0.8fr_170px]"
        >
          <div>
            <p className="font-bold text-slate-900">{plan.name}</p>
            <p className="mt-1 line-clamp-2 text-slate-500">
              {plan.description ?? "Sem descrição"}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              {plan._count.subscriptions} cliente(s) vinculados
            </p>
          </div>
          <span className="font-black text-emerald-700">
            {formatCurrency(plan.price)}
          </span>
          <div className="text-slate-600">
            <p>
              Produtos:{" "}
              <strong className="text-slate-900">
                {plan.isUnlimited ? "Ilimitado" : plan.maxProducts ?? "Ilimitado"}
              </strong>
            </p>
            <p>
              Visitas:{" "}
              <strong className="text-slate-900">
                {plan.isUnlimited ? "Ilimitado" : plan.maxMonthlyVisits?.toLocaleString("pt-BR") ?? "Ilimitado"}
              </strong>
            </p>
            <p>
              Pedidos:{" "}
              <strong className="text-slate-900">
                {plan.isUnlimited ? "Ilimitado" : plan.maxOrders ?? "Ilimitado"}
              </strong>
            </p>
            <p>
              Usuários/admins:{" "}
              <strong className="text-slate-900">
                {plan.isUnlimited ? "Ilimitado" : plan.maxUsers ?? "Ilimitado"}
              </strong>
            </p>
          </div>
          <span className="font-semibold text-slate-700">
            {plan.allowsCustomDomain ? "Permitido" : "Não permitido"}
          </span>
          <span
            className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-black ${
              plan.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {plan.isActive ? "Ativo" : "Inativo"}
          </span>
          <PlanTableActions
            id={plan.id}
            name={plan.name}
            description={plan.description}
            price={String(plan.price)}
            maxProducts={plan.maxProducts}
            maxMonthlyVisits={plan.maxMonthlyVisits}
            maxOrders={plan.maxOrders}
            maxStorageMb={plan.maxStorageMb}
            maxUsers={plan.maxUsers}
            isUnlimited={plan.isUnlimited}
            durationDays={plan.durationDays}
            releasedFeatures={plan.releasedFeatures}
            allowsCustomDomain={plan.allowsCustomDomain}
            hasBasicFeatures={plan.hasBasicFeatures}
            hasIntermediateFeatures={plan.hasIntermediateFeatures}
            hasAdvancedFeatures={plan.hasAdvancedFeatures}
            isActive={plan.isActive}
            subscriptionsCount={plan._count.subscriptions}
          />
        </div>
      ))}
    </div>
  );
}
