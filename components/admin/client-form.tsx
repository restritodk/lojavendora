"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanOption = {
  id: string;
  name: string;
  price?: unknown;
};

type ClientFormValues = {
  id?: string;
  name?: string;
  email?: string;
  storeName?: string;
  subdomain?: string;
  planId?: string;
  currentPeriodEnd?: string;
};

type ClientFormProps = {
  mode: "create" | "edit";
  plans: PlanOption[];
  initialValues?: ClientFormValues;
};

export function ClientForm({ mode, plans, initialValues }: ClientFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(initialValues?.planId ?? "");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const isFreePlan = Number(selectedPlan?.price ?? 0) === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const url =
      mode === "create"
        ? "/api/admin/clientes"
        : `/api/admin/clientes/${initialValues?.id}`;

    const response = await fetch(url, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Não foi possível salvar o cliente.");
      return;
    }

    const data = (await response.json()) as { id: string };
    router.push(`/admin/clientes/${data.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {error ? (
        <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Nome</span>
          <input
            name="name"
            defaultValue={initialValues?.name}
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
            placeholder="Nome do cliente"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">E-mail</span>
          <input
            name="email"
            type="email"
            defaultValue={initialValues?.email}
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
            placeholder="cliente@email.com"
          />
        </label>

        {mode === "create" ? (
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Senha inicial</span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
              placeholder="Mínimo de 8 caracteres"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Nome da loja</span>
          <input
            name="storeName"
            defaultValue={initialValues?.storeName}
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
            placeholder="Loja do cliente"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Subdomínio</span>
          <input
            name="subdomain"
            defaultValue={initialValues?.subdomain}
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
            placeholder="minhaloja"
          />
          <p className="mt-2 text-xs text-slate-500">
            Exemplo: minhaloja.lojavendora.com.br
          </p>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Plano</span>
          <select
            name="planId"
            value={selectedPlanId}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition focus:border-cyan-500"
          >
            <option value="">Selecione um plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>

        <label className={isFreePlan ? "hidden" : "block"}>
          <span className="text-sm font-bold text-slate-700">
            Data de vencimento
          </span>
          <input
            name="currentPeriodEnd"
            type="date"
            defaultValue={initialValues?.currentPeriodEnd}
            required={!isFreePlan}
            className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-slate-900 outline-none transition focus:border-cyan-500"
          />
        </label>
        {isFreePlan ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Plano gratuito: sem vencimento, sem fatura e sem cobrança recorrente.
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Salvar cliente"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
