import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ClientForm } from "@/components/admin/client-form";
import { getActivePlans, getAdminClientById } from "@/lib/admin-clients";

function toDateInputValue(date?: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, plans] = await Promise.all([
    getAdminClientById(id),
    getActivePlans(),
  ]);

  if (!client || client.role !== "USER") {
    notFound();
  }

  const store = client.stores[0];
  const subscription = store?.subscriptions[0];
  const planOptions = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
  }));

  return (
    <AdminShell>
      <div className="mb-8 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm font-bold text-[#17293f]">Editar cliente</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">
          {client.name ?? client.email}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Atualize dados do lojista, loja, plano e vencimento.
        </p>
      </div>

      <ClientForm
        mode="edit"
        plans={planOptions}
        initialValues={{
          id: client.id,
          name: client.name ?? "",
          email: client.email,
          storeName: store?.name ?? "",
          subdomain: store?.subdomain ?? "",
          planId: subscription?.planId ?? "",
          currentPeriodEnd: toDateInputValue(subscription?.currentPeriodEnd),
        }}
      />
    </AdminShell>
  );
}
