"use client";

import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { changePasswordAction, type ChangePasswordResult } from "./actions";

export function ChangePasswordForm() {
  const [feedback, setFeedback] = useState<ChangePasswordResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFeedback(null);
    startTransition(() => {
      void changePasswordAction(formData).then(setFeedback);
    });
  }

  return (
    <form action={submit} className="max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">Conta</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Alterar senha</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Crie uma nova senha para acessar o painel da sua loja.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-600">Nova senha</span>
          <input
            name="password"
            type="password"
            minLength={6}
            required
            className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-600">Repetir senha</span>
          <input
            name="confirmPassword"
            type="password"
            minLength={6}
            required
            className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Senha salva!"
          errorTitle="Não foi possível salvar"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}
