"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";
import { updateCustomerAction, type CustomerActionResult } from "../../actions";

type EditableCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  personType: string;
  document: string | null;
  stateRegistration: string | null;
  birthDate: Date | null;
  gender: string | null;
  secondaryPhone: string | null;
  secondaryEmail: string | null;
  accessEmail: string | null;
  source: string | null;
  origin: string | null;
  notes: string | null;
  allowPromotions: boolean;
};

type EditCustomerFormProps = {
  customer: EditableCustomer;
};

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const [feedback, setFeedback] = useState<CustomerActionResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function submitForm(formData: FormData) {
    startTransition(() => {
      void updateCustomerAction(customer.id, formData).then((result) => {
        setFeedback(result);
      });
    });
  }

  return (
    <form ref={formRef} action={submitForm} className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-900">Dados Cadastrais</h2>
          <p className="text-sm text-slate-500">Edite os dados principais do comprador.</p>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-3">
          <SelectField
            label="Tipo de Pessoa"
            name="personType"
            defaultValue={customer.personType}
            options={[
              ["FISICA", "Física"],
              ["JURIDICA", "Jurídica"],
            ]}
          />
          <FormField label="Nome Completo *" name="name" defaultValue={customer.name} required />
          <FormField
            label="Data Nascimento"
            name="birthDate"
            type="date"
            defaultValue={customer.birthDate?.toISOString().slice(0, 10)}
          />
          <SelectField
            label="Sexo"
            name="gender"
            defaultValue={customer.gender ?? "NAO_INFORMADO"}
            options={[
              ["FEMININO", "Feminino"],
              ["MASCULINO", "Masculino"],
              ["NAO_INFORMADO", "Não informado"],
            ]}
          />
          <FormField label="CPF/CNPJ" name="document" defaultValue={customer.document ?? ""} />
          <FormField label="RG/IE" name="stateRegistration" defaultValue={customer.stateRegistration ?? ""} />
          <FormField label="Telefone 1" name="phone" defaultValue={customer.phone ?? ""} />
          <FormField label="Telefone 2" name="secondaryPhone" defaultValue={customer.secondaryPhone ?? ""} />
          <FormField label="E-mail Secundário" name="secondaryEmail" type="email" defaultValue={customer.secondaryEmail ?? ""} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-900">Informações de Acesso</h2>
          <p className="text-sm text-slate-500">Dados de login do comprador na loja.</p>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <FormField label="E-mail Principal" name="email" type="email" defaultValue={customer.email ?? ""} />
          <FormField label="E-mail de Acesso" name="accessEmail" type="email" defaultValue={customer.accessEmail ?? ""} />
          <label>
            <FieldLabel help={getFieldHelp("password", "Nova senha")}>
              Nova senha
            </FieldLabel>
            <div className="relative mt-2">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Preencha apenas para alterar"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none focus:border-[#17293f]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-sm text-slate-500 hover:bg-slate-100"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-900">Benefícios e Descontos</h2>
          <p className="text-sm text-slate-500">Origem, observações e promoções.</p>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <FormField label="Como nos conheceu?" name="source" defaultValue={customer.source ?? ""} />
          <FormField label="De onde veio?" name="origin" defaultValue={customer.origin ?? ""} />
          <label className="md:col-span-2">
            <FieldLabel help={getFieldHelp("notes", "Observações")}>
              Observações
            </FieldLabel>
            <textarea
              name="notes"
              defaultValue={customer.notes ?? ""}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#17293f]"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              name="allowPromotions"
              defaultChecked={customer.allowPromotions}
              className="size-4 accent-[#17293f]"
            />
            <FieldLabel help={getFieldHelp("allowPromotions", "Cliente aceita receber promoções e descontos.")}>
              Cliente aceita receber promoções e descontos.
            </FieldLabel>
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <button
          disabled={isPending}
          className="rounded-full bg-[#17293f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "✓ Salvar Alterações"}
        </button>
      </div>
      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Cliente atualizado com sucesso!"
          errorTitle="Não foi possível atualizar o cliente"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#17293f]"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<[string, string]>;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#17293f]"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
