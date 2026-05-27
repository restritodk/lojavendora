"use client";

import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  savePlatformMercadoPagoAction,
  type PlatformMercadoPagoResult,
} from "./actions";

type PlatformMercadoPagoFormProps = {
  initialValues: {
    publicKey: string;
    accessToken: string;
    active: boolean;
    sandbox: boolean;
  };
};

export function PlatformMercadoPagoForm({ initialValues }: PlatformMercadoPagoFormProps) {
  const [feedback, setFeedback] = useState<PlatformMercadoPagoResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFeedback(null);
    startTransition(() => {
      void savePlatformMercadoPagoAction(formData).then(setFeedback);
    });
  }

  return (
    <form action={submit} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-700">
          Credenciais do proprietário
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Mercado Pago da plataforma</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Essas credenciais cobram as mensalidades dos lojistas para o proprietário. Elas não são usadas no checkout dos clientes das lojas.
        </p>
      </div>

      <div className="mt-7 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-600">Public key</span>
          <input
            name="publicKey"
            defaultValue={initialValues.publicKey}
            className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-600">Access token</span>
          <input
            name="accessToken"
            type="password"
            defaultValue={initialValues.accessToken}
            className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-700">
          <input name="active" type="checkbox" defaultChecked={initialValues.active} className="size-4" />
          Ativar cobrança da plataforma
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-700">
          <input name="sandbox" type="checkbox" defaultChecked={initialValues.sandbox} className="size-4" />
          Usar modo teste/sandbox
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-7 rounded-full bg-[#17293f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar credenciais"}
      </button>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Credenciais salvas"
          errorTitle="Não foi possível salvar"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}
