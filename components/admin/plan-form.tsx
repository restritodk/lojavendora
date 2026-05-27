"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";

type PlanFormValues = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: string | number;
  maxProducts?: number | null;
  maxMonthlyVisits?: number | null;
  maxOrders?: number | null;
  maxStorageMb?: number | null;
  maxUsers?: number | null;
  isUnlimited?: boolean;
  durationDays?: number | null;
  releasedFeatures?: string[];
  allowsCustomDomain?: boolean;
  hasBasicFeatures?: boolean;
  hasIntermediateFeatures?: boolean;
  hasAdvancedFeatures?: boolean;
  isActive?: boolean;
};

type PlanFormProps = {
  mode: "create" | "edit";
  initialValues?: PlanFormValues;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function PlanForm({
  mode,
  initialValues,
  onSuccess,
  onCancel,
}: PlanFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const url =
      mode === "create"
        ? "/api/admin/planos"
        : `/api/admin/planos/${initialValues?.id}`;

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
      setError(data?.error ?? "Não foi possível salvar o plano.");
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }

    router.push("/admin/planos");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035]"
    >
      {error ? (
        <p className="m-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-6 p-5">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Informações comerciais
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <PlanInput
              name="name"
              label="Nome"
              defaultValue={initialValues?.name}
              placeholder="Loja Inicial"
            />
            <PlanCurrencyInput
              name="price"
              label="Preço mensal"
              defaultValue={initialValues?.price}
            />
            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-200">Descrição</span>
              <textarea
                name="description"
                defaultValue={initialValues?.description ?? ""}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                placeholder="Descrição comercial do plano"
              />
            </label>
          </div>
        </section>

        <section>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Limites do plano
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <PlanInput
              name="maxProducts"
              label="Produtos"
              type="number"
              min="0"
              defaultValue={initialValues?.maxProducts ?? ""}
              placeholder="100"
              required={false}
            />
            <PlanInput
              name="maxMonthlyVisits"
              label="Visitas mensais"
              type="number"
              min="0"
              defaultValue={initialValues?.maxMonthlyVisits ?? ""}
              placeholder="100000"
              required={false}
            />
            <PlanInput
              name="maxUsers"
              label="Usuários/admins"
              type="number"
              min="0"
              defaultValue={initialValues?.maxUsers ?? ""}
              placeholder="3"
              required={false}
            />
            <PlanInput
              name="maxOrders"
              label="Pedidos"
              type="number"
              min="0"
              defaultValue={initialValues?.maxOrders ?? ""}
              placeholder="500"
              required={false}
            />
            <PlanInput
              name="maxStorageMb"
              label="Armazenamento (MB)"
              type="number"
              min="0"
              defaultValue={initialValues?.maxStorageMb ?? ""}
              placeholder="1024"
              required={false}
            />
            <PlanInput
              name="durationDays"
              label="Duração em dias"
              type="number"
              min="0"
              defaultValue={initialValues?.durationDays ?? ""}
              placeholder="30"
              required={false}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Deixe o campo vazio para ilimitado. No plano gratuito, deixe a duração vazia para não ter vencimento.
          </p>
        </section>

        <section>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Recursos e status
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CheckboxField
              name="isUnlimited"
              label="Plano ilimitado"
              defaultChecked={initialValues?.isUnlimited}
            />
            <CheckboxField
              name="allowsCustomDomain"
              label="Permite domínio próprio"
              defaultChecked={initialValues?.allowsCustomDomain}
            />
            <CheckboxField
              name="hasBasicFeatures"
              label="Recursos básicos liberados"
              defaultChecked={initialValues?.hasBasicFeatures}
            />
            <CheckboxField
              name="hasIntermediateFeatures"
              label="Recursos intermediários liberados"
              defaultChecked={initialValues?.hasIntermediateFeatures}
            />
            <CheckboxField
              name="hasAdvancedFeatures"
              label="Recursos avançados liberados"
              defaultChecked={initialValues?.hasAdvancedFeatures}
            />
            <CheckboxField
              name="isActive"
              label="Plano ativo"
              defaultChecked={initialValues?.isActive ?? true}
            />
          </div>
          <label className="mt-5 block">
            <span className="text-sm font-bold text-slate-200">
              Recursos liberados
            </span>
            <textarea
              name="releasedFeatures"
              defaultValue={initialValues?.releasedFeatures?.join(", ") ?? ""}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
              placeholder="product-variations, advanced-reports, coupons"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Separe os identificadores por vírgula.
            </span>
          </label>
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-900/95 p-5 backdrop-blur sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel ?? (() => router.back())}
          className="rounded-full border border-white/10 px-6 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Cancelar
        </button>
        <button
          disabled={isSubmitting}
          className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Salvar plano"}
        </button>
      </div>
    </form>
  );
}

function PlanInput({
  label,
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <input
        {...props}
        required={required}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
      />
    </label>
  );
}

function PlanCurrencyInput({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <CurrencyInput
        name={name}
        defaultValue={defaultValue}
        required
        className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
      />
    </label>
  );
}

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-4 accent-emerald-400"
      />
      <span className="text-sm font-bold text-slate-200">{label}</span>
    </label>
  );
}
