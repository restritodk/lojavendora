"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { PlanForm } from "@/components/admin/plan-form";

type PlanModalProps = {
  mode: "create" | "edit";
  trigger: React.ReactNode;
  initialValues?: React.ComponentProps<typeof PlanForm>["initialValues"];
};

export function PlanModal({ mode, trigger, initialValues }: PlanModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const modal = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="grid h-[calc(100vh-2rem)] max-h-[760px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/60 lg:grid-cols-[320px_1fr]">
        <aside className="hidden h-full overflow-hidden bg-[radial-gradient(circle_at_top,#10b98140,transparent_36%),linear-gradient(180deg,#111827,#020617)] p-7 lg:block">
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
            {mode === "create" ? "Novo plano" : "Edição"}
          </span>
          <h2 className="mt-8 text-3xl font-black leading-tight">
            {mode === "create"
              ? "Configure uma nova oferta comercial."
              : "Ajuste limites e preço do plano."}
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Defina preço mensal, limites de uso, status e se o plano permite
            domínio próprio para lojistas.
          </p>

          <div className="mt-10 space-y-3">
            {["Preço mensal", "Limites da loja", "Domínio próprio"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-200"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-6 py-5">
            <div>
              <p className="text-sm font-bold text-emerald-300">
                {mode === "create" ? "Novo plano" : "Editar plano"}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {mode === "create"
                  ? "Criar plano comercial"
                  : initialValues?.name ?? "Editar plano"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid size-10 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            <PlanForm
              mode={mode}
              initialValues={initialValues}
              onCancel={() => setIsOpen(false)}
              onSuccess={() => setIsOpen(false)}
            />
          </div>
        </section>
      </div>
    </div>
  ) : null;

  return (
    <>
      <span onClick={() => setIsOpen(true)}>{trigger}</span>
      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
