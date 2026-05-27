"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";
import { createCustomerAction, type CreateCustomerResult } from "./actions";

const steps = [
  { id: "dados", icon: "👥", label: "Dados Cadastrais" },
  { id: "endereco", icon: "🏠", label: "Endereço" },
  { id: "acesso", icon: "🔒", label: "Informações de Acesso" },
  { id: "beneficios", icon: "🏷️", label: "Benefícios e Descontos" },
] as const;

type StepId = (typeof steps)[number]["id"];

type NewCustomerFormProps = {
  error?: string;
  success?: string;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
};

export function NewCustomerForm({ error, success }: NewCustomerFormProps) {
  const [activeStep, setActiveStep] = useState<StepId>("dados");
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(
    error
      ? { type: "error", message: error }
      : success
        ? { type: "success", message: "Cliente cadastrado com sucesso." }
        : null,
  );
  const [personType, setPersonType] = useState<"FISICA" | "JURIDICA">("FISICA");
  const [address, setAddress] = useState({
    zipCode: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
  });
  const [documentValue, setDocumentValue] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modalType, setModalType] = useState<"save" | "cancel" | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [cepStatus, setCepStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedback(null);
      window.history.replaceState(null, "", window.location.pathname);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function handleZipCodeChange(value: string) {
    const onlyNumbers = value.replace(/\D/g, "").slice(0, 8);
    const formatted = onlyNumbers.replace(/^(\d{5})(\d)/, "$1-$2");

    setAddress((current) => ({ ...current, zipCode: formatted }));

    if (onlyNumbers.length !== 8) {
      setCepStatus("");
      return;
    }

    setCepStatus("Buscando endereço...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${onlyNumbers}/json/`);
      const data = (await response.json()) as ViaCepResponse;

      if (!response.ok || data.erro) {
        setCepStatus("CEP não encontrado. Preencha manualmente.");
        return;
      }

      setAddress((current) => ({
        ...current,
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
        complement: data.complemento ?? current.complement,
      }));
      setCepStatus("Endereço preenchido automaticamente. Informe apenas o número.");
    } catch {
      setCepStatus("Não foi possível buscar o CEP agora.");
    }
  }

  function submitForm(formData: FormData) {
    setPendingFormData(formData);
    setModalType("save");
  }

  function confirmSave() {
    if (!pendingFormData) {
      return;
    }

    setModalType(null);

    startTransition(() => {
      void createCustomerAction(pendingFormData).then((result) => {
        setFeedback(result as CreateCustomerResult);

        if (result.type === "success") {
          formRef.current?.reset();
          setActiveStep("dados");
          setPersonType("FISICA");
          setAddress({
            zipCode: "",
            street: "",
            neighborhood: "",
            city: "",
            state: "",
            complement: "",
          });
          setDocumentValue("");
          setPhone("");
          setSecondaryPhone("");
          setPendingFormData(null);
        }
      });
    });
  }

  function confirmCancel() {
    setModalType(null);
    setActiveStep("dados");
  }

  function handlePersonTypeChange(value: "FISICA" | "JURIDICA") {
    setPersonType(value);
    setDocumentValue("");
  }

  function handleDocumentChange(value: string) {
    const maxLength = personType === "FISICA" ? 11 : 14;
    const onlyNumbers = value.replace(/\D/g, "").slice(0, maxLength);

    setDocumentValue(
      personType === "FISICA" ? formatCpf(onlyNumbers) : formatCnpj(onlyNumbers),
    );
  }

  function handlePhoneChange(value: string, setter: (value: string) => void) {
    const onlyNumbers = value.replace(/\D/g, "").slice(0, 11);

    setter(formatPhone(onlyNumbers));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="grid h-fit gap-3">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-black transition ${
              activeStep === step.id
                ? "border-[#17293f] bg-[#17293f] text-white shadow-lg"
                : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-[#17293f] hover:text-[#17293f]"
            }`}
          >
            <span className="text-xl">{step.icon}</span>
            {step.label}
          </button>
        ))}
      </aside>

      <form ref={formRef} action={submitForm} className="grid gap-6">
        <div className={activeStep === "dados" ? "block" : "hidden"}>
          <PanelSection
            icon="👥"
            title="Dados Cadastrais"
            description="Preencha as informações principais do cliente."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <PersonTypeRadioGroup
                label="Tipo de Pessoa"
                name="personType"
                value={personType}
                onChange={handlePersonTypeChange}
                options={[
                  ["FISICA", "Física"],
                  ["JURIDICA", "Jurídica"],
                ]}
              />
              <FormField label="Nome Completo *" name="name" placeholder="Ex: Joana Silveira" required />
              <FormField label="Data Nascimento" name="birthDate" type="date" />
              <RadioGroup
                label="Sexo"
                name="gender"
                options={[
                  ["FEMININO", "Feminino"],
                  ["MASCULINO", "Masculino"],
                  ["NAO_INFORMADO", "Não informado"],
                ]}
              />
              <ControlledField
                label={personType === "FISICA" ? "CPF" : "CNPJ"}
                name="document"
                value={documentValue}
                onChange={handleDocumentChange}
                placeholder={
                  personType === "FISICA" ? "000.000.000-00" : "00.000.000/0000-00"
                }
                inputMode="numeric"
              />
              <FormField label="RG/IE" name="stateRegistration" placeholder="Ex: SP 00.000.000" />
              <ControlledField
                label="Telefone 1"
                name="phone"
                value={phone}
                onChange={(value) => handlePhoneChange(value, setPhone)}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
              />
              <ControlledField
                label="Telefone 2"
                name="secondaryPhone"
                value={secondaryPhone}
                onChange={(value) => handlePhoneChange(value, setSecondaryPhone)}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
              />
              <FormField label="E-mail Secundário" name="secondaryEmail" type="email" placeholder="email@dominio.com.br" />
            </div>
          </PanelSection>
        </div>

        <div className={activeStep === "endereco" ? "block" : "hidden"}>
          <PanelSection
            icon="🏠"
            title="Endereço"
            description="Digite o CEP para preencher rua, bairro, cidade e estado automaticamente."
          >
            <div className="grid gap-5 md:grid-cols-4">
              <label>
                <FieldLabel help={getFieldHelp("zipCode", "CEP")}>CEP</FieldLabel>
                <input
                  name="zipCode"
                  value={address.zipCode}
                  onChange={(event) => void handleZipCodeChange(event.target.value)}
                  placeholder="00000-000"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
                />
                {cepStatus ? (
                  <span className="mt-2 block text-xs font-semibold text-[#17293f]">
                    {cepStatus}
                  </span>
                ) : null}
              </label>
              <ControlledField
                label="Rua / Avenida"
                name="street"
                value={address.street}
                onChange={(value) => setAddress((current) => ({ ...current, street: value }))}
                className="md:col-span-2"
              />
              <FormField label="Número *" name="number" placeholder="Digite o número" />
              <ControlledField
                label="Complemento"
                name="complement"
                value={address.complement}
                onChange={(value) =>
                  setAddress((current) => ({ ...current, complement: value }))
                }
              />
              <ControlledField
                label="Bairro"
                name="neighborhood"
                value={address.neighborhood}
                onChange={(value) =>
                  setAddress((current) => ({ ...current, neighborhood: value }))
                }
              />
              <ControlledField
                label="Cidade"
                name="city"
                value={address.city}
                onChange={(value) => setAddress((current) => ({ ...current, city: value }))}
              />
              <ControlledField
                label="Estado"
                name="state"
                value={address.state}
                onChange={(value) => setAddress((current) => ({ ...current, state: value }))}
              />
            </div>
          </PanelSection>
        </div>

        <div className={activeStep === "acesso" ? "block" : "hidden"}>
          <PanelSection
            icon="🔒"
            title="Informações de Acesso"
            description="Dados usados pelo comprador para acessar a conta na loja."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="E-mail de Acesso" name="accessEmail" type="email" placeholder="acesso@dominio.com.br" />
              <PasswordField
                label="Senha"
                name="password"
                placeholder="Digite uma senha"
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
              />
            </div>
          </PanelSection>
        </div>

        <div className={activeStep === "beneficios" ? "block" : "hidden"}>
          <PanelSection
            icon="🏷️"
            title="Benefícios e Descontos"
            description="Origem, observações e permissão de promoções."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Como nos conheceu?"
                name="source"
                options={["Não informado", "Google", "Instagram", "Indicação", "Loja física", "Outro"]}
              />
              <SelectField
                label="De onde veio?"
                name="origin"
                options={["Não informado", "Site", "WhatsApp", "Marketplace", "Campanha", "Outro"]}
              />
              <label className="md:col-span-2">
                <FieldLabel help={getFieldHelp("notes", "Observações")}>
                  Observações
                </FieldLabel>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Anotações internas sobre o cliente"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  name="allowPromotions"
                  defaultChecked
                  className="size-4 accent-[#17293f]"
                />
                <FieldLabel help={getFieldHelp("allowPromotions", "Cliente aceita receber promoções e descontos.")}>
                  Cliente aceita receber promoções e descontos.
                </FieldLabel>
              </label>
            </div>
          </PanelSection>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="flex gap-2">
            {steps.map((step) => (
              <span
                key={step.id}
                className={`size-2 rounded-full ${
                  activeStep === step.id ? "bg-[#17293f]" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setModalType("cancel")}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 hover:text-[#17293f]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => moveStep(activeStep, setActiveStep, "previous")}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 hover:text-[#17293f]"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => moveStep(activeStep, setActiveStep, "next")}
              className="rounded-full border border-[#17293f] px-5 py-3 text-sm font-black text-[#17293f] transition hover:bg-[#17293f] hover:text-white"
            >
              Próximo
            </button>
            <button
              disabled={isPending}
              className="rounded-full bg-[#17293f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "✓ Salvar Cliente"}
            </button>
          </div>
        </div>
      </form>

      {modalType ? (
        <ConfirmModal
          type={modalType}
          isPending={isPending}
          onClose={() => setModalType(null)}
          onConfirm={modalType === "save" ? confirmSave : confirmCancel}
        />
      ) : null}
      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Cliente salvo com sucesso!"
          errorTitle="Não foi possível salvar o cliente"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function moveStep(
  currentStep: StepId,
  setActiveStep: (step: StepId) => void,
  direction: "previous" | "next",
) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const nextIndex =
    direction === "next"
      ? Math.min(currentIndex + 1, steps.length - 1)
      : Math.max(currentIndex - 1, 0);

  setActiveStep(steps[nextIndex].id);
}

function formatCpf(value: string) {
  return value
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatCnpj(value: string) {
  return value
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function formatPhone(value: string) {
  if (value.length <= 10) {
    return value
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
  }

  return value
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
}

function PanelSection({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-5 py-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="font-black text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
      />
    </label>
  );
}

function ControlledField({
  label,
  name,
  value,
  onChange,
  placeholder,
  inputMode,
  className = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric";
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
      />
    </label>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  visible,
  onToggle,
}: {
  label: string;
  name: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <div className="relative mt-2">
        <input
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-sm text-slate-500 transition hover:bg-slate-100 hover:text-[#17293f]"
          title={visible ? "Ocultar senha" : "Ver senha"}
        >
          {visible ? "🙈" : "👁️"}
        </button>
      </div>
    </label>
  );
}

function ConfirmModal({
  type,
  isPending,
  onClose,
  onConfirm,
}: {
  type: "save" | "cancel";
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isSave = type === "save";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <div
          className={`mx-auto grid size-14 place-items-center rounded-2xl text-2xl ${
            isSave ? "bg-emerald-50" : "bg-amber-50"
          }`}
        >
          {isSave ? "✓" : "!"}
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          {isSave ? "Criar conta do cliente?" : "Cancelar cadastro?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isSave
            ? "Os dados estão todos certos. Deseja criar essa conta?"
            : "Deseja realmente cancelar? Ao confirmar, você volta para Dados Cadastrais."}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
          >
            {isPending ? "Aguarde..." : "Sim"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RadioGroup({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <fieldset>
      <legend>
        <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      </legend>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
        {options.map(([value, text], index) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={index === 0}
              className="size-4 accent-[#17293f]"
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PersonTypeRadioGroup({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: "FISICA" | "JURIDICA";
  onChange: (value: "FISICA" | "JURIDICA") => void;
  options: Array<["FISICA" | "JURIDICA", string]>;
}) {
  return (
    <fieldset>
      <legend>
        <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      </legend>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
        {options.map(([optionValue, text]) => (
          <label key={optionValue} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className="size-4 accent-[#17293f]"
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <select
        name={name}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#17293f]"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
