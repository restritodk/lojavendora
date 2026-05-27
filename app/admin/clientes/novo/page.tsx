import { AdminShell } from "@/components/admin/admin-shell";
import { ClientForm } from "@/components/admin/client-form";
import { getActivePlans } from "@/lib/admin-clients";

export default async function NewClientPage() {
  const plans = await getActivePlans();
  const planOptions = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
  }));

  return (
    <AdminShell>
      <div className="mb-8 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm font-bold text-[#17293f]">Cadastro</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">
          Novo cliente
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Crie um lojista, sua primeira loja, plano e vencimento financeiro.
        </p>
      </div>

      <ClientForm mode="create" plans={planOptions} />
    </AdminShell>
  );
}
