"use client";

import { useState, useTransition } from "react";
import {
  advancedFeatureGroups,
  type AdvancedFeature,
  type AdvancedFeatureCategory,
  type AdvancedFeatureGroup,
  type AdvancedField,
} from "@/lib/advanced-features";
import { getNextPlan, getPlanBySlug, isPlanAtLeast } from "@/lib/plan-utils";
import { saveAdvancedFeatureAction } from "./actions";

type AdvancedValues = Record<string, string | string[]>;

type StoredAdvancedSetting = {
  featureId: string;
  active: boolean;
  values: AdvancedValues;
};

type AdvancedFeatureWithValues = AdvancedFeature & {
  values?: AdvancedValues;
};

type FeatureGroupWithValues = Omit<AdvancedFeatureGroup, "features"> & {
  features: AdvancedFeatureWithValues[];
};

type CurrentPlan = {
  name: string;
  slug: string;
};

const categoryFilters: Array<AdvancedFeatureCategory | "Todas"> = [
  "Todas",
  "Conversão",
  "Produto",
  "Pedido",
  "Marketing/SEO",
  "Segurança",
  "Checkout",
];

export function AdvancedFunctionsPanel({
  currentPlan,
  initialSettings,
}: {
  currentPlan: CurrentPlan;
  initialSettings: StoredAdvancedSetting[];
}) {
  const [featureGroups, setFeatureGroups] = useState(() =>
    applyStoredSettings(advancedFeatureGroups, initialSettings),
  );
  const [selectedCategory, setSelectedCategory] = useState<AdvancedFeatureCategory | "Todas">("Todas");
  const [selectedFeature, setSelectedFeature] = useState<AdvancedFeatureWithValues | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const allFeatures = featureGroups.flatMap((group) => group.features);
  const visibleGroups = filterGroupsByCategory(featureGroups, selectedCategory);
  const activeFeatures = allFeatures.filter((featureItem) => featureItem.active).length;
  const availableFeatures = allFeatures.filter((featureItem) =>
    isPlanAtLeast(currentPlan.slug, featureItem.minimumPlanSlug),
  ).length;
  const blockedFeatures = allFeatures.length - availableFeatures;
  const nextPlan = getNextPlan(currentPlan.slug);

  function saveFeature(formData: FormData) {
    if (!selectedFeature) return;

    const feature = selectedFeature;

    startTransition(async () => {
      const result = await saveAdvancedFeatureAction(feature.id, formData);
      const active = formData.get("__active") === "true";
      const values = collectClientValues(formData);

      if (result.type === "success") {
        setFeatureGroups((currentGroups) =>
          updateFeatureState(currentGroups, feature.id, active, values),
        );
        setSelectedFeature(null);
      }

      setFeedback({
        type: result.type,
        message:
          result.type === "success"
            ? `Configuração "${feature.title}" salva com sucesso para esta loja.`
            : result.message,
      });
    });
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-[#17293f] px-6 py-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Catálogo premium</p>
            <h1 className="mt-1 text-2xl font-black">Funções Avançadas</h1>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <p className="text-xs font-bold text-cyan-100">Seu plano atual</p>
            <p className="text-lg font-black">{currentPlan.name}</p>
          </div>
        </header>
        <div className="grid gap-4 bg-slate-50 p-5 md:grid-cols-4">
          <MetricCard label="Disponíveis no plano" value={availableFeatures} tone="cyan" />
          <MetricCard label="Funções ativas" value={activeFeatures} tone="emerald" />
          <MetricCard label="Bloqueadas" value={blockedFeatures} tone="amber" />
          <MetricCard label="Próximo plano" value={nextPlan?.name ?? "Plano máximo"} tone="slate" />
        </div>
        <div className="border-l-4 border-cyan-500 bg-white px-6 py-4 text-sm leading-6 text-slate-500">
          Ative recursos avançados por loja, respeitando o plano contratado. Funções acima do plano aparecem bloqueadas e não podem ser salvas até o upgrade.
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {categoryFilters.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full border px-4 py-2 text-sm font-black transition ${
              selectedCategory === category
                ? "border-[#17293f] bg-[#17293f] text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-cyan-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {visibleGroups.map((group) => (
        <section key={group.title} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black text-slate-700">{group.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{group.description}</p>
          </header>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {group.features.map((featureItem) => (
              <FeatureCard
                key={featureItem.id}
                feature={featureItem}
                currentPlanSlug={currentPlan.slug}
                onOpen={() => setSelectedFeature(featureItem)}
              />
            ))}
          </div>
        </section>
      ))}

      {selectedFeature ? (
        <FeatureModal
          feature={selectedFeature}
          currentPlanSlug={currentPlan.slug}
          onClose={() => setSelectedFeature(null)}
          onSave={saveFeature}
          isPending={isPending}
        />
      ) : null}

      {feedback ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
            <div
              className={`mx-auto grid size-14 place-items-center rounded-2xl text-2xl ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {feedback.type === "success" ? "✓" : "!"}
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-950">
              {feedback.type === "success" ? "Configuração salva!" : "Erro ao salvar"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="mt-7 w-full rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white"
            >
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeatureCard({
  feature,
  currentPlanSlug,
  onOpen,
}: {
  feature: AdvancedFeatureWithValues;
  currentPlanSlug: string;
  onOpen: () => void;
}) {
  const allowed = isPlanAtLeast(currentPlanSlug, feature.minimumPlanSlug);
  const minimumPlan = getPlanBySlug(feature.minimumPlanSlug);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        allowed ? "border-slate-200" : "border-amber-200 bg-amber-50/30"
      }`}
    >
      <span
        className={`absolute left-0 top-0 border-b-[46px] border-r-[46px] border-r-transparent ${
          feature.active ? "border-b-emerald-700" : allowed ? "border-b-slate-300" : "border-b-amber-500"
        }`}
      />
      <span className="absolute left-2 top-1 text-sm font-black text-white">
        {allowed ? "✓" : "!"}
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-3xl text-slate-800">
          {feature.icon}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${
          allowed ? "bg-cyan-50 text-cyan-700" : "bg-amber-100 text-amber-800"
        }`}>
          {minimumPlan.name}
        </span>
      </div>
      <h3 className="mt-4 min-h-12 text-sm font-black text-slate-800">
        {feature.title}
      </h3>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {feature.category} • {feature.impactLabel}
      </p>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">
        {feature.info}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className={`mt-5 w-full rounded-xl border px-5 py-3 text-sm font-black transition ${
          !allowed
            ? "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200"
            : feature.active
              ? "border-emerald-700 text-emerald-800 hover:bg-emerald-50"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
      >
        {!allowed
          ? `Disponível no ${minimumPlan.name}`
          : feature.active
            ? "Ativo e configurável"
            : "Configurar recurso"}
      </button>
    </article>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "cyan" | "emerald" | "amber" | "slate";
}) {
  const toneClass = {
    cyan: "bg-cyan-50 text-cyan-800 border-cyan-100",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    slate: "bg-slate-100 text-slate-800 border-slate-200",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function LockedFeatureNotice({
  feature,
}: {
  feature: AdvancedFeatureWithValues;
}) {
  const minimumPlan = getPlanBySlug(feature.minimumPlanSlug);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-200 text-lg font-black text-amber-900">
          !
        </span>
        <div>
          <h3 className="font-black text-amber-950">Função bloqueada neste plano</h3>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Esta função está disponível a partir do plano {minimumPlan.name}. Faça upgrade para ativar e salvar essa configuração na loja.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureModal({
  feature,
  currentPlanSlug,
  onClose,
  onSave,
  isPending,
}: {
  feature: AdvancedFeatureWithValues;
  currentPlanSlug: string;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isPending: boolean;
}) {
  const allowed = isPlanAtLeast(currentPlanSlug, feature.minimumPlanSlug);
  const minimumPlan = getPlanBySlug(feature.minimumPlanSlug);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/70 px-4 py-8">
      <form action={onSave} className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-700">{feature.title}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Plano mínimo: {minimumPlan.name} • {feature.category}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-4xl font-black leading-none text-slate-600"
          >
            ×
          </button>
        </header>

        <div className="p-6">
          {!allowed ? <LockedFeatureNotice feature={feature} /> : null}

          <div className="flex gap-4 rounded-lg bg-slate-50 p-4 text-slate-500">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-500 text-2xl font-black text-white">
              i
            </span>
            <p className="text-lg leading-7">{feature.info}</p>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4">
              <FieldLabel
                label="Status do recurso nesta loja"
                help="Ative ou desative esta função apenas para a loja atual. A alteração não afeta outras lojas do sistema."
              />
              <Toggle name="__active" defaultChecked={feature.active} />
            </div>
            {feature.fields.map((field) => (
              <ModalField key={field.name} field={field} values={feature.values ?? {}} />
            ))}
          </div>

          {feature.warning ? (
            <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              <span className="text-2xl">⚠</span>
              <p>{feature.warning}</p>
            </div>
          ) : null}
        </div>

        <footer className="flex justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-600 px-8 py-3 text-lg font-black text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !allowed}
            className={`rounded px-8 py-3 text-lg font-black text-white ${
              allowed ? "bg-green-600" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            {!allowed ? `Disponível no ${minimumPlan.name}` : isPending ? "Salvando..." : "✓ Salvar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ModalField({
  field,
  values,
}: {
  field: AdvancedField;
  values: AdvancedValues;
}) {
  const savedValue = values[field.name];

  switch (field.kind) {
    case "toggle":
      return (
        <div className="grid gap-2">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          <Toggle
            name={field.name}
            defaultChecked={getBooleanValue(savedValue, field.defaultChecked)}
          />
        </div>
      );
    case "checkboxes":
      return (
        <div className="grid gap-3">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          {field.options?.map((option) => (
            <label key={option} className="flex items-center gap-3 text-lg text-slate-600">
              <input
                type="checkbox"
                name={field.name}
                value={option}
                defaultChecked={getCheckboxValue(savedValue, option)}
                className="size-5 accent-cyan-700"
              />
              {option}
            </label>
          ))}
        </div>
      );
    case "radio":
      return (
        <div className="grid gap-3">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          {field.options?.map((option, index) => (
            <label key={option} className="flex items-center gap-3 text-lg text-slate-600">
              <input
                name={field.name}
                type="radio"
                value={option}
                defaultChecked={
                  getStringValue(savedValue, field.options?.[0] ?? "") === option ||
                  (!savedValue && index === 0)
                }
                className="size-5 accent-cyan-700"
              />
              {option}
            </label>
          ))}
        </div>
      );
    case "select":
      return (
        <label className="grid gap-2">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          <select
            name={field.name}
            defaultValue={getStringValue(savedValue, field.options?.[0] ?? "")}
            className="h-12 max-w-md rounded border border-cyan-300 bg-white px-4 text-slate-600"
          >
            {field.options?.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    case "textarea":
      return (
        <label className="grid gap-2">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          <textarea
            name={field.name}
            defaultValue={getStringValue(savedValue, field.defaultValue)}
            className="min-h-32 rounded border border-slate-200 px-4 py-3"
          />
        </label>
      );
    case "code":
      return (
        <label className="grid gap-2">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          <textarea
            name={field.name}
            defaultValue={getStringValue(savedValue, field.defaultValue)}
            className="min-h-36 rounded border border-slate-200 bg-white px-4 py-3 font-mono text-sm"
          />
        </label>
      );
    default:
      return (
        <label className="grid gap-2">
          <FieldLabel label={field.label} help={getFieldHelp(field)} />
          <div className="flex max-w-md">
            <input
              name={field.name}
              placeholder={field.placeholder}
              defaultValue={getStringValue(savedValue, field.defaultValue)}
              className="h-12 min-w-0 flex-1 rounded-l border border-slate-200 px-4"
            />
            {field.unit ? (
              <span className="grid place-items-center rounded-r bg-slate-100 px-4 text-slate-500">
                {field.unit}
              </span>
            ) : null}
          </div>
        </label>
      );
  }
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold text-slate-500">
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

function getFieldHelp(field: AdvancedField) {
  if (field.help) {
    return field.help;
  }

  if (field.kind === "toggle") {
    return "Use esta chave para ativar ou desativar esta opção dentro da função selecionada.";
  }

  if (field.kind === "checkboxes") {
    return "Marque uma ou mais opções que devem ficar disponíveis para esta loja.";
  }

  if (field.kind === "radio") {
    return "Escolha apenas uma regra para definir como esta função deve se comportar na loja.";
  }

  if (field.kind === "select") {
    return "Selecione a opção que melhor representa a regra que deseja aplicar nesta loja.";
  }

  if (field.kind === "code") {
    return "Cole aqui o código fornecido pela ferramenta externa. Use com cuidado, pois ele pode afetar o site da loja.";
  }

  if (field.kind === "textarea") {
    return "Digite o texto ou conteúdo que será usado por esta função no site da loja.";
  }

  return "Informe o valor que será usado por esta função apenas na loja atual.";
}

function Toggle({
  name,
  defaultChecked = true,
}: {
  name: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center gap-3 text-base text-slate-600">
      <input type="hidden" name={name} value={String(checked)} />
      <span>Sim</span>
      <button
        type="button"
        onClick={() => setChecked((current) => !current)}
        className={`relative h-6 w-14 rounded-full transition ${
          checked ? "bg-cyan-100" : "bg-red-100"
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full transition ${
            checked ? "left-2 bg-cyan-700" : "left-8 bg-red-600"
          }`}
        />
      </button>
      <span>Não</span>
    </div>
  );
}

function applyStoredSettings(
  sourceGroups: AdvancedFeatureGroup[],
  settings: StoredAdvancedSetting[],
): FeatureGroupWithValues[] {
  const settingsByFeature = new Map(
    settings.map((setting) => [setting.featureId, setting]),
  );

  return sourceGroups.map((group) => ({
    ...group,
    features: group.features.map((featureItem) => {
      const setting = settingsByFeature.get(featureItem.id);

      if (!setting) {
        return featureItem;
      }

      return {
        ...featureItem,
        active: setting.active,
        values: setting.values,
      };
    }),
  }));
}

function updateFeatureState(
  sourceGroups: FeatureGroupWithValues[],
  featureId: string,
  active: boolean,
  values: AdvancedValues,
): FeatureGroupWithValues[] {
  return sourceGroups.map((group) => ({
    ...group,
    features: group.features.map((featureItem) =>
      featureItem.id === featureId
        ? {
            ...featureItem,
            active,
            values,
          }
        : featureItem,
    ),
  }));
}

function filterGroupsByCategory(
  sourceGroups: FeatureGroupWithValues[],
  category: AdvancedFeatureCategory | "Todas",
) {
  if (category === "Todas") {
    return sourceGroups;
  }

  return sourceGroups
    .map((group) => ({
      ...group,
      features: group.features.filter((featureItem) => featureItem.category === category),
    }))
    .filter((group) => group.features.length > 0);
}

function collectClientValues(formData: FormData) {
  const values: AdvancedValues = {};

  for (const [key, value] of formData.entries()) {
    if (key === "__active" || typeof value !== "string") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(values, key)) {
      const current = values[key];
      values[key] = Array.isArray(current) ? [...current, value] : [current, value];
      continue;
    }

    values[key] = value;
  }

  return values;
}

function getStringValue(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function getBooleanValue(value: string | string[] | undefined, fallback = true) {
  if (typeof value === "undefined") {
    return fallback;
  }

  return getStringValue(value) === "true";
}

function getCheckboxValue(value: string | string[] | undefined, option: string) {
  if (typeof value === "undefined") {
    return true;
  }

  return Array.isArray(value) ? value.includes(option) : value === option;
}
