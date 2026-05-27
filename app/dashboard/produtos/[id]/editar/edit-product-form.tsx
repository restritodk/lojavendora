"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition, type ChangeEventHandler } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  ProductCategoryPicker,
  type ProductCategoryOption,
} from "../../category-picker";
import { updateProductAction, type UpdateProductResult } from "./actions";

type EditProductData = {
  id: string;
  name: string;
  price: string;
  oldPrice: string;
  costPrice: string;
  shortDescription: string;
  description: string;
  brand: string;
  model: string;
  warranty: string;
  imageUrl: string;
  youtubeUrl: string;
  freightType: string;
  weight: string;
  height: string;
  width: string;
  length: string;
  declaredValue: string;
  additionalFreight: string;
  allowOutOfStock: boolean;
  stock: number;
  criticalStock: number;
  showOnSite: boolean;
  showOnHome: boolean;
  isLaunch: boolean;
  minQuantity: number;
  priority: string;
  recommendedMode: string;
  tags: string;
  customCode: string;
  ageGroup: string;
  genderTarget: string;
  status: string;
  categoryId: string;
  mainImageUrl: string | null;
  fixedFreightRules: Array<{
    state: string;
    value: string;
    minDays: string;
    maxDays: string;
  }>;
};

type FixedFreightRule = {
  id: string;
  state: string;
  value: string;
  minDays: string;
  maxDays: string;
};

const brazilianStates = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
];

export function EditProductForm({
  product,
  categories,
}: {
  product: EditProductData;
  categories: ProductCategoryOption[];
}) {
  const [feedback, setFeedback] = useState<UpdateProductResult | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [freightType, setFreightType] = useState(product.freightType || "correios");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function handleSubmit(formData: FormData) {
    setPendingFormData(formData);
    setShowConfirm(true);
  }

  function confirmSave() {
    if (!pendingFormData) return;
    setShowConfirm(false);

    startTransition(() => {
      void updateProductAction(product.id, pendingFormData).then((result) => {
        setFeedback(result);
      });
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-6">
      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[220px_1fr]">
        <div className="grid h-fit gap-3">
          <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {product.mainImageUrl ? (
              <Image
                src={product.mainImageUrl}
                alt={product.name}
                width={180}
                height={180}
                unoptimized
                className="aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <span className="text-sm text-slate-400">Sem imagem</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Para trocar fotos, use por enquanto o cadastro de novo produto. A
            edição completa de imagens será a próxima etapa.
          </p>
        </div>

        <div className="grid gap-6">
          <Panel title="Informações principais">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nome do Produto *" name="name" defaultValue={product.name} required className="md:col-span-2" />
              <MoneyField label="Preço de Venda *" name="price" defaultValue={product.price} required />
              <MoneyField label="Preço Antigo" name="oldPrice" defaultValue={product.oldPrice} />
              <MoneyField label="Preço de Custo" name="costPrice" defaultValue={product.costPrice} />
              <Field label="Marca" name="brand" defaultValue={product.brand} />
              <Field label="Modelo" name="model" defaultValue={product.model} />
              <Field label="Garantia" name="warranty" defaultValue={product.warranty} />
              <Field label="Pré Descrição" name="shortDescription" defaultValue={product.shortDescription} className="md:col-span-2" />
              <Textarea label="Descrição" name="description" defaultValue={product.description} />
              <ProductCategoryPicker categories={categories} defaultValue={product.categoryId} />
              <Field label="Palavras Chave" name="tags" defaultValue={product.tags} />
              <Field label="Código Personalizado" name="customCode" defaultValue={product.customCode} />
            </div>
          </Panel>

          <Panel title="Imagem, vídeo, estoque e envio">
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="URL da imagem" name="imageUrl" defaultValue={product.imageUrl} className="md:col-span-2" />
              <Field label="Link do YouTube" name="youtubeUrl" defaultValue={product.youtubeUrl} />
              <Select label="Tipo de Frete" name="freightType" defaultValue={product.freightType} options={[
                ["correios", "Frete calculado automaticamente pelos Correios"],
                ["fixo", "Frete fixo"],
                ["gratis", "Frete grátis"],
              ]} value={freightType} onChange={(event) => setFreightType(event.target.value)} className="md:col-span-2" />
              {freightType === "correios" ? (
                <>
                  <Field label="Peso (kg)" name="weight" defaultValue={product.weight} />
                  <Field label="Altura (cm)" name="height" defaultValue={product.height} />
                  <Field label="Largura (cm)" name="width" defaultValue={product.width} />
                  <Field label="Comprimento (cm)" name="length" defaultValue={product.length} />
                  <MoneyField label="Valor Declarado" name="declaredValue" defaultValue={product.declaredValue} />
                  <MoneyField label="Valor Somado ao Frete" name="additionalFreight" defaultValue={product.additionalFreight} />
                </>
              ) : null}
              {freightType === "gratis" ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700 md:col-span-3">
                  Frete grátis para este produto. O comprador verá essa informação no produto e no checkout.
                </div>
              ) : null}
              <Field label="Estoque Atual" name="stock" type="number" defaultValue={String(product.stock)} />
              <Field label="Estoque Crítico" name="criticalStock" type="number" defaultValue={String(product.criticalStock)} />
            </div>
            {freightType === "fixo" ? (
              <FixedFreightRulesEditor initialRules={product.fixedFreightRules} />
            ) : null}
          </Panel>

          <Panel title="Venda e exibição">
            <div className="grid gap-5 md:grid-cols-3">
              <Select label="Situação" name="status" defaultValue={product.status} options={[
                ["ACTIVE", "Disponível para venda"],
                ["INACTIVE", "Inativo"],
              ]} />
              <Field label="Quantidade mínima" name="minQuantity" type="number" defaultValue={String(product.minQuantity)} />
              <Select label="Prioridade" name="priority" defaultValue={product.priority} options={[
                ["", "Sem prioridade"],
                ["alta", "Alta"],
                ["media", "Média"],
                ["baixa", "Baixa"],
              ]} />
              <Select label="Produtos recomendados" name="recommendedMode" defaultValue={product.recommendedMode} options={[
                ["nenhum", "Não quero recomendar outros produtos"],
                ["automatico", "Automática"],
                ["manual", "Manual"],
              ]} className="md:col-span-2" />
              <Select label="Faixa etária" name="ageGroup" defaultValue={product.ageGroup} options={[
                ["todas", "Todas as faixas etárias"],
                ["adulto", "Adulto"],
                ["13-17-anos", "13 a 17 anos"],
              ]} />
              <Select label="Sexo" name="genderTarget" defaultValue={product.genderTarget} options={[
                ["todos", "Todos os gêneros"],
                ["feminino", "Produto feminino"],
                ["masculino", "Produto masculino"],
              ]} />
              <Switch label="Exibir produto no site?" name="showOnSite" defaultChecked={product.showOnSite} />
              <Switch label="Exibir na página inicial?" name="showOnHome" defaultChecked={product.showOnHome} />
              <Switch label="Exibir como lançamento?" name="isLaunch" defaultChecked={product.isLaunch} />
              <Switch label="Disponibilizar sem estoque?" name="allowOutOfStock" defaultChecked={product.allowOutOfStock} />
              <Switch label="Exibir vídeo na listagem?" name="showVideoOnListing" defaultChecked={false} />
            </div>
          </Panel>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <Link href="/dashboard/produtos" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600">
          Voltar para listagem
        </Link>
        <button
          disabled={isPending}
          className="rounded-xl bg-[#17293f] px-6 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "✓ Salvar Alterações"}
        </button>
      </div>

      {showConfirm ? (
        <ConfirmModal
          isPending={isPending}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmSave}
        />
      ) : null}
      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Produto atualizado com sucesso!"
          errorTitle="Não foi possível atualizar o produto"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="mb-5 text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
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
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#17293f]"
      />
    </label>
  );
}

function MoneyField({
  label,
  name,
  defaultValue,
  required,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <CurrencyInput
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#17293f]"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="md:col-span-2">
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <textarea
        name={name}
        rows={6}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#17293f]"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
  className = "",
  value,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<[string, string]>;
  className?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
}) {
  const valueProps = value !== undefined ? { value, onChange } : { defaultValue };

  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <select
        name={name}
        {...valueProps}
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

function FixedFreightRulesEditor({
  initialRules,
}: {
  initialRules: Array<{ state: string; value: string; minDays: string; maxDays: string }>;
}) {
  const [rules, setRules] = useState<FixedFreightRule[]>(() =>
    initialRules.map((rule) => ({ ...rule, id: crypto.randomUUID() })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FixedFreightRule>(emptyFixedFreightRule());
  const [page, setPage] = useState(1);
  const selectedStateName = getStateName(draft.state);
  const totalPages = Math.max(Math.ceil(rules.length / 10), 1);
  const paginatedRules = rules.slice((page - 1) * 10, page * 10);

  function saveDraft() {
    if (!draft.state || !draft.value || !draft.minDays || !draft.maxDays) {
      return;
    }

    setRules((current) => {
      if (editingId) {
        return current.map((rule) => (rule.id === editingId ? { ...draft, id: editingId } : rule));
      }

      return [...current.filter((rule) => rule.state !== draft.state), { ...draft, id: crypto.randomUUID() }];
    });
    setDraft(emptyFixedFreightRule());
    setEditingId(null);
    setPage(Math.max(Math.ceil((rules.length + 1) / 10), 1));
  }

  function editRule(rule: FixedFreightRule) {
    setDraft(rule);
    setEditingId(rule.id);
  }

  function deleteRule(id: string) {
    setRules((current) => current.filter((rule) => rule.id !== id));
    setPage((current) => Math.min(current, Math.max(Math.ceil((rules.length - 1) / 10), 1)));
    if (editingId === id) {
      setDraft(emptyFixedFreightRule());
      setEditingId(null);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-base font-black text-slate-900">Regras de frete fixo por estado</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Preencha os campos e salve a regra. Ela aparecerá na lista abaixo para editar ou deletar.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-black text-slate-500">Estado/UF de destino</span>
            <select
              value={draft.state}
              onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#17293f]"
            >
              <option value="">Selecione</option>
              {brazilianStates.map(([uf, name]) => (
                <option key={uf} value={uf}>
                  {name} ({uf})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black text-slate-500">Valor do frete</span>
            <CurrencyInput
              key={draft.id}
              name="fixedFreightDraftValue"
              defaultValue={draft.value}
              onValueChange={(_, formattedValue) =>
                setDraft((current) => ({ ...current, value: formattedValue }))
              }
              value={draft.value}
              placeholder="35,00"
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#17293f]"
            />
          </label>
          <DaysInput label="Prazo mínimo" value={draft.minDays} onChange={(value) => setDraft((current) => ({ ...current, minDays: value }))} />
          <DaysInput label="Prazo máximo" value={draft.maxDays} onChange={(value) => setDraft((current) => ({ ...current, maxDays: value }))} />
          <button type="button" onClick={saveDraft} className="h-12 rounded-xl bg-[#17293f] px-5 text-sm font-black text-white">
            {editingId ? "Salvar" : "+ Adicionar"}
          </button>
        </div>
        {selectedStateName ? (
          <p className="mt-3 text-xs font-bold text-slate-500">
            Estado selecionado: {selectedStateName} ({draft.state})
          </p>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.2fr_0.8fr_1fr_auto] gap-3 bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Estado</span>
          <span>Valor</span>
          <span>Prazo</span>
          <span className="text-right">Ações</span>
        </div>
        {rules.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
            Nenhuma regra cadastrada ainda.
          </div>
        ) : (
          paginatedRules.map((rule) => (
            <div key={rule.id} className="grid grid-cols-[1.2fr_0.8fr_1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm">
              <strong className="text-slate-800">{getStateName(rule.state)} ({rule.state})</strong>
              <span className="font-bold text-slate-600">R$ {rule.value}</span>
              <span className="font-bold text-slate-600">{rule.minDays} a {rule.maxDays} dias</span>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => editRule(rule)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">
                  Editar
                </button>
                <button type="button" onClick={() => deleteRule(rule.id)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600">
                  Deletar
                </button>
              </div>
              <input type="hidden" name="fixedFreightState" value={rule.state} />
              <input type="hidden" name="fixedFreightValue" value={rule.value} />
              <input type="hidden" name="fixedFreightMinDays" value={rule.minDays} />
              <input type="hidden" name="fixedFreightMaxDays" value={rule.maxDays} />
            </div>
          ))
        )}
        {rules.length > 10 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
            <span>
              Página {page} de {totalPages} · {rules.length} regras salvas
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DaysInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type="number"
          min={1}
          className="min-w-0 flex-1 px-3 text-sm outline-none"
        />
        <span className="grid place-items-center bg-slate-100 px-3 text-xs font-black text-slate-500">dias</span>
      </div>
    </label>
  );
}

function emptyFixedFreightRule(): FixedFreightRule {
  return {
    id: crypto.randomUUID(),
    state: "",
    value: "",
    minDays: "",
    maxDays: "",
  };
}

function getStateName(uf: string) {
  return brazilianStates.find(([state]) => state === uf)?.[1] ?? "";
}

function Switch({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[#17293f]" />
    </label>
  );
}

function ConfirmModal({
  isPending,
  onClose,
  onConfirm,
}: {
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <h2 className="text-xl font-black text-slate-950">Salvar alterações?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confirme para atualizar este produto na sua loja.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 disabled:opacity-60"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Sim"}
          </button>
        </div>
      </div>
    </div>
  );
}
