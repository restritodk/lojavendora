"use client";

import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  saveNotificationSettingsAction,
  type NotificationSettingsResult,
} from "./actions";

type NotificationSetting = {
  type: string;
  label: string;
  help: string;
  active: boolean;
  threshold: string;
  hasThreshold?: boolean;
};

export function NotificationSettingsForm({
  settings,
}: {
  settings: NotificationSetting[];
}) {
  const [feedback, setFeedback] = useState<NotificationSettingsResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      setFeedback(await saveNotificationSettingsAction(formData));
    });
  }

  return (
    <form action={submit} className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-[#d9d9d9] px-5 py-3">
        <span className="text-xl text-slate-700">▱</span>
        <h1 className="font-black text-slate-700">Notificações</h1>
      </header>
      <div className="m-3 flex gap-4 rounded border-l-4 border-cyan-400 bg-slate-50 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-400 text-2xl font-black italic text-white">
          i
        </span>
        <p className="text-sm leading-6 text-slate-500">
          Selecione quais notificações deseja receber. Estes avisos serão exibidos
          no sininho do painel e enviados apenas para esta loja.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {settings.map((setting) => (
          <NotificationRow key={setting.type} setting={setting} />
        ))}
      </div>

      <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
        <button
          disabled={isPending}
          className="rounded bg-green-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "✓ Salvar Alterações"}
        </button>
      </footer>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Notificações salvas!"
          errorTitle="Não foi possível salvar"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}

function NotificationRow({ setting }: { setting: NotificationSetting }) {
  const [active, setActive] = useState(setting.active);

  return (
    <div className="grid gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <FieldLabel label={setting.label} help={setting.help} />
        {setting.hasThreshold ? (
          <input
            name={`${setting.type}:threshold`}
            defaultValue={setting.threshold}
            className="h-9 w-28 rounded border border-slate-200 px-3 text-sm outline-none focus:border-cyan-600"
          />
        ) : null}
      </div>
      <input type="hidden" name={`${setting.type}:active`} value={String(active)} />
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>Sim</span>
        <button
          type="button"
          onClick={() => setActive((current) => !current)}
          className={`relative h-5 w-12 rounded-full transition ${
            active ? "bg-cyan-100" : "bg-red-100"
          }`}
        >
          <span
            className={`absolute top-1 size-3 rounded-full transition ${
              active ? "left-2 bg-cyan-700" : "left-7 bg-red-600"
            }`}
          />
        </button>
        <span>Não</span>
      </div>
    </div>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
      {label}
      <span className="group relative inline-grid size-5 cursor-help place-items-center rounded-full border border-cyan-200 bg-cyan-50 text-[11px] font-black text-cyan-700">
        ?
        <span className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-72 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold leading-5 text-white shadow-xl group-hover:block">
          {help}
        </span>
      </span>
    </span>
  );
}
