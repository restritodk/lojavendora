"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientStatus } from "@/lib/admin-clients";

type PlanOption = {
  id: string;
  name: string;
  price?: unknown;
};

export type ClientModalRow = {
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

type ClientActionsModalProps = {
  client: ClientModalRow;
  plans: PlanOption[];
};

export function ClientActionsModal({ client, plans }: ClientActionsModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(client.planId);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const isFreePlan = Number(selectedPlan?.price ?? 0) === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/clientes/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Não foi possível salvar o cliente.");
      return;
    }

    setMode(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("view")}
          title="Ver cliente"
          className="grid size-10 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span aria-hidden>👁</span>
          <span className="sr-only">Ver</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("edit")}
          title="Editar cliente"
          className="grid size-10 place-items-center rounded-full bg-emerald-400 text-slate-950 transition hover:bg-emerald-300"
        >
          <span aria-hidden>✎</span>
          <span className="sr-only">Editar</span>
        </button>
      </div>

      {mode ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-sm font-bold text-cyan-700">
                  {mode === "view" ? "Detalhes do cliente" : "Editar cliente"}
                </p>
                <h2 className="mt-2 text-2xl font-black">{client.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{client.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="grid size-10 place-items-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            {mode === "view" ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  ["Nome", client.name],
                  ["E-mail", client.email],
                  ["Loja", client.storeName],
                  ["Domínio", `${client.subdomain}.lojavendora.com.br`],
                  ["Plano", client.planName],
                  ["Status financeiro", client.statusLabel],
                  ["Vencimento", client.dueDateLabel],
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
            ) : (
              <form onSubmit={handleSubmit} className="mt-6">
                {error ? (
                  <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="grid gap-5 md:grid-cols-2">
                  <ModalInput name="name" label="Nome" defaultValue={client.name} />
                  <ModalInput
                    name="email"
                    label="E-mail"
                    type="email"
                    defaultValue={client.email}
                  />
                  <ModalInput
                    name="storeName"
                    label="Nome da loja"
                    defaultValue={client.storeName}
                  />
                  <ModalInput
                    name="subdomain"
                    label="Subdomínio"
                    defaultValue={client.subdomain}
                  />
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Plano</span>
                    <select
                      name="planId"
                      value={selectedPlanId}
                      onChange={(event) => setSelectedPlanId(event.target.value)}
                      required
                      className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-500"
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!isFreePlan ? (
                    <ModalInput
                      name="currentPeriodEnd"
                      label="Data de vencimento"
                      type="date"
                      defaultValue={client.dueDateInput}
                      required
                    />
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                      Plano gratuito: isento, sem vencimento, sem fatura e sem cobrança.
                    </div>
                  )}
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    disabled={isSubmitting}
                    className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                  >
                    {isSubmitting ? "Salvando..." : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(null)}
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModalInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        {...props}
        className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500"
      />
    </label>
  );
}
