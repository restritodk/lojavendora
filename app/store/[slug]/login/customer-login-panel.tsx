"use client";

import Link from "next/link";
import { useState } from "react";
import { customerLoginAction, customerRegisterAction } from "./actions";

type StoreLoginInfo = {
  name: string;
  subdomain: string;
};

type AddressState = {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export function CustomerLoginPanel({
  store,
  returnTo,
  error,
}: {
  store: StoreLoginInfo;
  returnTo: string;
  error?: string;
}) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const loginAction = customerLoginAction.bind(null, store.subdomain);
  const registerAction = customerRegisterAction.bind(null, store.subdomain);
  const storePath = `/store/${store.subdomain}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff,transparent_36%),#f1f5f9] px-6 py-10 text-slate-950">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[2.25rem] bg-white shadow-2xl ring-1 ring-slate-200 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative overflow-hidden bg-slate-950 p-8 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.35),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.28),transparent_34%)]" />
          <div className="relative">
            <Link href={storePath} className="text-sm font-black text-emerald-300">
              {store.name}
            </Link>
            <h1 className="mt-24 text-4xl font-black leading-tight">
              Acesse sua conta para finalizar a compra.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Faça login para voltar direto ao carrinho, escolher a forma de
              pagamento disponível nesta loja e concluir seu pedido.
            </p>
            <div className="mt-10 grid gap-3 text-sm font-semibold text-white/75">
              <span>✓ Carrinho preservado após login</span>
              <span>✓ Pagamentos configurados pelo lojista</span>
              <span>✓ Pedidos vinculados apenas a esta loja</span>
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-9">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <form action={loginAction} className="mx-auto max-w-md">
            <input type="hidden" name="returnTo" value={returnTo} />
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
              Login do comprador
            </p>
            <h2 className="mt-2 text-3xl font-black">Entre na sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use seu e-mail e senha cadastrados nesta loja.
            </p>

            <label className="mt-7 block">
              <span className="text-sm font-bold">E-mail de acesso</span>
              <input
                name="accessEmail"
                type="email"
                required
                placeholder="cliente@email.com"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-bold">Senha</span>
              <input
                name="password"
                type="password"
                required
                placeholder="Sua senha"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <button className="mt-7 w-full rounded-full bg-slate-950 px-5 py-3.5 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              Entrar e continuar
            </button>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">
                Não tem conta nesta loja?
              </p>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="mt-2 text-sm font-black text-emerald-700 underline decoration-2 underline-offset-4"
              >
                Cadastre-se
              </button>
            </div>

            <Link
              href={storePath}
              className="mt-6 block text-center text-sm font-bold text-slate-500"
            >
              Voltar para a loja
            </Link>
          </form>
        </div>
      </section>

      {isRegisterOpen ? (
        <RegisterModal
          returnTo={returnTo}
          registerAction={registerAction}
          onClose={() => setIsRegisterOpen(false)}
        />
      ) : null}
    </main>
  );
}

function RegisterModal({
  returnTo,
  registerAction,
  onClose,
}: {
  returnTo: string;
  registerAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  const [documentValue, setDocumentValue] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressState>({
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [zipStatus, setZipStatus] = useState("");
  const documentType = documentValue.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF";

  async function updateZipCode(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.replace(/^(\d{5})(\d)/, "$1-$2");

    setAddress((current) => ({ ...current, zipCode: formatted }));

    if (digits.length < 8) {
      setZipStatus("");
      return;
    }

    setZipStatus("Buscando endereço...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await response.json()) as ViaCepResponse;

      if (!response.ok || data.erro) {
        setZipStatus("CEP não encontrado.");
        return;
      }

      setAddress((current) => ({
        ...current,
        zipCode: data.cep ?? formatted,
        street: data.logradouro ?? current.street,
        complement: data.complemento || current.complement,
        neighborhood: data.bairro ?? current.neighborhood,
        city: data.localidade ?? current.city,
        state: data.uf ?? current.state,
      }));
      setZipStatus("Endereço preenchido automaticamente.");
    } catch {
      setZipStatus("Não foi possível consultar o CEP agora.");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <form
        action={registerAction}
        className="mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        <header className="flex items-start justify-between gap-5 bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Cadastro do comprador
            </p>
            <h2 className="mt-2 text-2xl font-black">Crie sua conta</h2>
            <p className="mt-1 text-sm text-white/60">
              Após o cadastro você volta automaticamente para o checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-white/10 text-2xl font-black"
          >
            ×
          </button>
        </header>

        <div className="grid gap-6 p-6">
          <section>
            <h3 className="text-lg font-black">Dados pessoais</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input name="name" label="Nome" required />
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  CPF/CNPJ
                  <small className="ml-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">
                    {documentType}
                  </small>
                </span>
                <input
                  name="document"
                  value={documentValue}
                  onChange={(event) => setDocumentValue(formatCpfCnpj(event.target.value))}
                  required
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">Telefone</span>
                <input
                  name="phone"
                  value={phone}
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                  required
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <Input name="accessEmail" label="Email" type="email" required />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-black">Endereço de entrega</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">CEP</span>
                <input
                  name="zipCode"
                  value={address.zipCode}
                  onChange={(event) => void updateZipCode(event.target.value)}
                  required
                  inputMode="numeric"
                  placeholder="00000-000"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
                />
                {zipStatus ? (
                  <span className="text-xs font-semibold text-slate-500">{zipStatus}</span>
                ) : null}
              </label>
              <AddressInput
                name="street"
                label="Rua / Avenida"
                value={address.street}
                onChange={(value) => setAddress((current) => ({ ...current, street: value }))}
                className="md:col-span-2"
                required
              />
              <AddressInput
                name="number"
                label="Número"
                value={address.number}
                onChange={(value) => setAddress((current) => ({ ...current, number: value }))}
                required
              />
              <AddressInput
                name="complement"
                label="Complemento"
                value={address.complement}
                onChange={(value) => setAddress((current) => ({ ...current, complement: value }))}
              />
              <AddressInput
                name="neighborhood"
                label="Bairro"
                value={address.neighborhood}
                onChange={(value) => setAddress((current) => ({ ...current, neighborhood: value }))}
                required
              />
              <AddressInput
                name="city"
                label="Cidade"
                value={address.city}
                onChange={(value) => setAddress((current) => ({ ...current, city: value }))}
                required
              />
              <AddressInput
                name="state"
                label="Estado"
                value={address.state}
                onChange={(value) => setAddress((current) => ({ ...current, state: value.toUpperCase().slice(0, 2) }))}
                required
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-black">Senha de acesso</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input name="password" label="Senha" type="password" minLength={6} required />
              <Input name="confirmPassword" label="Confirmar senha" type="password" minLength={6} required />
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600"
          >
            Cancelar
          </button>
          <button className="rounded-full bg-emerald-600 px-7 py-3 text-sm font-black text-white shadow-lg">
            Cadastre-se
          </button>
        </footer>
      </form>
    </div>
  );
}

function Input({
  name,
  label,
  type = "text",
  required,
  minLength,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}

function AddressInput({
  name,
  label,
  value,
  onChange,
  required,
  className = "",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}

function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
