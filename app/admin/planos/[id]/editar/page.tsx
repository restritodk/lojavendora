import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { PlanForm } from "@/components/admin/plan-form";
import { getAdminPlanById } from "@/lib/admin-plans";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getAdminPlanById(id);

  if (!plan) {
    notFound();
  }

  return (
    <AdminShell>
      <div className="mb-8 rounded-[1.75rem] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
        <p className="text-sm font-bold text-emerald-300">Editar plano</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{plan.name}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Atualize preço, limites, domínio próprio e status.
        </p>
      </div>

      <PlanForm
        mode="edit"
        initialValues={{
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: String(plan.price),
          maxProducts: plan.maxProducts,
          maxMonthlyVisits: plan.maxMonthlyVisits,
          maxOrders: plan.maxOrders,
          maxStorageMb: plan.maxStorageMb,
          maxUsers: plan.maxUsers,
          isUnlimited: plan.isUnlimited,
          durationDays: plan.durationDays,
          releasedFeatures: plan.releasedFeatures,
          allowsCustomDomain: plan.allowsCustomDomain,
          hasBasicFeatures: plan.hasBasicFeatures,
          hasIntermediateFeatures: plan.hasIntermediateFeatures,
          hasAdvancedFeatures: plan.hasAdvancedFeatures,
          isActive: plan.isActive,
        }}
      />
    </AdminShell>
  );
}
