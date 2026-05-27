import { AdminShell } from "@/components/admin/admin-shell";
import { PlanModal } from "@/components/admin/plan-modal";
import { PlanTable } from "@/components/admin/plan-table";
import { getAdminPlans } from "@/lib/admin-plans";

export default async function AdminPlansPage() {
  const plans = await getAdminPlans();

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-[#17293f]">Configuração</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Planos comerciais
          </h1>
        </div>
        <PlanModal
          mode="create"
          trigger={
            <button
              type="button"
              className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]"
            >
              Novo plano
            </button>
          }
        />
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-4xl font-black tracking-tight">
          Configurar planos e limites
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Gerencie preço mensal, limites de uso, domínio próprio e status dos
          planos vendidos aos lojistas.
        </p>
      </section>

      <div className="mt-8">
        <PlanTable plans={plans} />
      </div>
    </AdminShell>
  );
}
