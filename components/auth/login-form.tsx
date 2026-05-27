"use client";

import Link from "next/link";
import { useState } from "react";
import { loginAction } from "@/lib/actions";

type LoginFormProps = {
  error?: string;
};

const errorMessages: Record<string, string> = {
  "invalid-credentials": "E-mail ou senha inválidos.",
  "missing-store": "Informe o e-mail ou identificador da loja.",
  "staff-store-denied": "Este funcionário não está vinculado a esta loja ou está inativo.",
};

export function LoginForm({ error }: LoginFormProps) {
  const [staffMode, setStaffMode] = useState(false);

  return (
    <>
      <Link href="/" className="text-2xl font-black lg:hidden">
        Vendora
      </Link>
      <div className="mt-10 lg:mt-0">
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
          {staffMode ? "Acesso do funcionário" : "Login do lojista"}
        </span>
        <h2 className="mt-5 text-3xl font-bold">Entre na sua conta</h2>
        <p className="mt-3 text-slate-400">
          {staffMode
            ? "Informe a loja onde trabalha e seus dados de acesso para entrar apenas no painel permitido."
            : "Use seu e-mail e senha para acessar o painel administrativo da sua loja."}
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {errorMessages[error] ?? "Não foi possível fazer login."}
        </p>
      ) : null}

      <form action={loginAction} className="mt-8 space-y-5">
        <input type="hidden" name="accessMode" value={staffMode ? "staff" : "owner"} />
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-1">
          <button
            type="button"
            onClick={() => setStaffMode(false)}
            className={`rounded-xl px-3 py-2 text-sm font-black transition ${!staffMode ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            Sou lojista
          </button>
          <button
            type="button"
            onClick={() => setStaffMode(true)}
            className={`rounded-xl px-3 py-2 text-sm font-black transition ${staffMode ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            Sou funcionário
          </button>
        </div>

        {staffMode ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              E-mail ou identificador da loja
            </span>
            <input
              name="storeEmail"
              type="text"
              placeholder="email do lojista ou slug da loja"
              required={staffMode}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Usado para garantir que você acesse somente a loja onde trabalha.
            </span>
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-300">
            {staffMode ? "E-mail do funcionário" : "E-mail ou usuário"}
          </span>
          <input
            name="email"
            type="text"
            placeholder={staffMode ? "funcionario@empresa.com" : "voce@empresa.com ou eurico"}
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Senha</span>
          <input
            name="password"
            type="password"
            placeholder="Digite sua senha"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300"
          />
        </label>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              checked={staffMode}
              onChange={(event) => setStaffMode(event.target.checked)}
              className="size-4 rounded"
            />
            Acessar como funcionário de uma loja
          </label>
          <a href="#" className="font-semibold text-emerald-300">
            Esqueci minha senha
          </a>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300"
        >
          Entrar
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-400">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-bold text-emerald-300">
          Crie sua conta
        </Link>
      </p>
    </>
  );
}
