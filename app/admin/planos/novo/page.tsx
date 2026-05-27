import { AdminShell } from "@/components/admin/admin-shell";
import { PlanForm } from "@/components/admin/plan-form";

export default function NewPlanPage() {
  return (
    <AdminShell>
      <div className="mb-8 rounded-[1.75rem] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
        <p className="text-sm font-bold text-emerald-300">Configuração</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Novo plano</h1>
        <p className="mt-2 text-sm text-slate-400">
          Crie um plano comercial com preço, limites e regras de domínio.
        </p>
      </div>

      <PlanForm mode="create" />
    </AdminShell>
  );
}
