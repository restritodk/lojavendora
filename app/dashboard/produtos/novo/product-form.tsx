"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition, type ChangeEventHandler } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  ProductCategoryPicker,
  type ProductCategoryOption,
} from "../category-picker";
import { createProductAction, type ProductActionResult } from "./actions";

const steps = [
  { id: "principal", icon: "📦", label: "Informações Principais" },
  { id: "imagem", icon: "🖼️", label: "Imagem e Foto" },
  { id: "estoque", icon: "🚚", label: "Estoque e Envio" },
  { id: "venda", icon: "🏪", label: "Venda e Exibição" },
  { id: "variacoes", icon: "🔗", label: "Variações do Produto" },
] as const;

const MAX_PRODUCT_IMAGES = 10;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
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

type StepId = (typeof steps)[number]["id"];

type ProductFormProps = {
  categories: ProductCategoryOption[];
};

type ProductImagePreview = {
  id: string;
  name: string;
  url: string;
  file: File;
};

type FixedFreightRule = {
  id: string;
  state: string;
  value: string;
  minDays: string;
  maxDays: string;
};

export function ProductForm({ categories }: ProductFormProps) {
  const [activeStep, setActiveStep] = useState<StepId>("principal");
  const [showPriceOptions, setShowPriceOptions] = useState(false);
  const [images, setImages] = useState<ProductImagePreview[]>([]);
  const [freightType, setFreightType] = useState("correios");
  const [modalType, setModalType] = useState<"save" | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [feedback, setFeedback] = useState<ProductActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function submitForm(formData: FormData) {
    formData.delete("images");

    for (const image of images) {
      formData.append("images", image.file, image.name);
    }

    formData.set("imageOrder", images.map((image) => image.name).join(","));
    setPendingFormData(formData);
    setModalType("save");
  }

  function confirmSave() {
    if (!pendingFormData) {
      return;
    }

    setModalType(null);
    startTransition(() => {
      void createProductAction(pendingFormData).then((result) => {
        setFeedback(result);

        if (result.type === "success") {
          formRef.current?.reset();
          setActiveStep("principal");
          setShowPriceOptions(false);
          setFreightType("correios");
          setImages([]);
          setPendingFormData(null);
        }
      });
    });
  }

  function handleImagesChange(files: FileList | null) {
    if (!files) {
      return;
    }

    const selectedFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setFeedback({
          type: "error",
          message: `A imagem ${file.name} ultrapassa ${MAX_IMAGE_SIZE_MB}MB.`,
        });
        return false;
      }

      return true;
    });

    setImages((current) => {
      const availableSlots = Math.max(MAX_PRODUCT_IMAGES - current.length, 0);
      const nextFiles = selectedFiles.slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        setFeedback({
          type: "error",
          message: `Você pode adicionar no máximo ${MAX_PRODUCT_IMAGES} fotos por produto.`,
        });
      }

      return [
        ...current,
        ...nextFiles.map((file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
          name: file.name,
          url: URL.createObjectURL(file),
          file,
        })),
      ];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function moveImage(index: number, direction: "left" | "right") {
    setImages((current) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const copy = [...current];
      const item = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = item;
      return copy;
    });
  }

  function makeMainImage(index: number) {
    setImages((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      return item ? [item, ...copy] : current;
    });
  }

  function removeImage(index: number) {
    setImages((current) => {
      const image = current[index];

      if (image) {
        URL.revokeObjectURL(image.url);
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
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
        <div className={activeStep === "principal" ? "block" : "hidden"}>
          <PanelSection
            icon="📦"
            title="Informações Principais"
            description="Preencha nome, preço, descrição e identificação do produto."
          >
            <InfoBox>
              Você precisa preencher os campos Nome do Produto e Preço de venda
              para salvar. Depois, complete as demais informações para uma vitrine
              mais profissional.
            </InfoBox>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <FormField label="Nome do Produto *" name="name" placeholder="Ex: Camisa, Notebook..." required className="md:col-span-2" />
              <div>
                <MoneyField label="Preço de Venda *" name="price" required />
                <button
                  type="button"
                  onClick={() => setShowPriceOptions((current) => !current)}
                  className="mt-2 text-sm font-bold text-[#17293f] underline-offset-4 hover:underline"
                >
                  {showPriceOptions ? "- Ocultar Opções" : "+ Opções de Preço"}
                </button>
              </div>
              {showPriceOptions ? (
                <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <MoneyField label="Preço Antigo" name="oldPrice" />
                  <MoneyField label="Preço de Custo" name="costPrice" />
                </div>
              ) : null}
              <FormField label="Marca" name="brand" placeholder="Ex: Adidas, Apple, Intel..." />
              <FormField label="Modelo" name="model" placeholder="Ex: Galaxy S, Inspiron..." />
              <FormField label="Garantia" name="warranty" placeholder="Ex: 3 meses, 1 ano..." />
              <FormField label="Pré Descrição" name="shortDescription" placeholder="Resumo curto do produto" className="md:col-span-2" />
              <label className="md:col-span-2">
                <FieldLabel help={getFieldHelp("description", "Descrição")}>
                  Descrição
                </FieldLabel>
                <textarea
                  name="description"
                  rows={10}
                  placeholder="Descreva benefícios, características e especificações do produto."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#17293f]"
                />
              </label>
              <ProductCategoryPicker categories={categories} />
              <FormField label="Palavras Chave" name="tags" placeholder="Ex: camiseta, lançamento, oferta" />
              <FormField label="Código Personalizado" name="customCode" placeholder="Ex: ABCD, 1234..." />
              <SelectField
                label="Faixa etária"
                name="ageGroup"
                options={[
                  ["todas", "Todas as faixas etárias"],
                  ["0-3-meses", "0 a 3 meses"],
                  ["3-12-meses", "3 a 12 meses"],
                  ["1-5-anos", "1 a 5 anos"],
                  ["6-12-anos", "6 a 12 anos"],
                  ["13-17-anos", "13 a 17 anos"],
                  ["adulto", "Adulto"],
                ]}
              />
              <SelectField
                label="Sexo"
                name="genderTarget"
                options={[
                  ["todos", "Todos os gêneros"],
                  ["feminino", "Produto feminino"],
                  ["masculino", "Produto masculino"],
                ]}
              />
            </div>
          </PanelSection>
        </div>

        <div className={activeStep === "imagem" ? "block" : "hidden"}>
          <PanelSection
            icon="🖼️"
            title="Imagem do Produto"
            description="Adicione imagem, vídeo e informações visuais do produto."
          >
            <InfoBox>
              Adicione fotos para este produto. Você também poderá trocar a ordem
              quando conectarmos o upload real de imagens.
            </InfoBox>
            <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                {images[0] ? (
                  <div className="text-center">
                    <Image
                      src={images[0].url}
                      alt="Imagem principal do produto"
                      width={176}
                      height={176}
                      unoptimized
                      className="mx-auto aspect-square w-full max-w-44 rounded-xl object-cover"
                    />
                    <p className="mt-2 text-xs font-bold text-[#17293f]">
                      Imagem principal
                    </p>
                  </div>
                ) : (
                  <div className="grid min-h-40 place-items-center text-center text-sm text-slate-400">
                    Imagem do produto
                  </div>
                )}
              </div>
              <div className="grid gap-5">
                <div>
                  <input
                    ref={fileInputRef}
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handleImagesChange(event.target.files)}
                    className="hidden"
                  />
                  <input type="hidden" name="imageOrder" value={images.map((image) => image.name).join(",")} />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Adicionar Imagem
                    </button>
                    <span className="text-xs text-slate-500">
                      Máximo {MAX_PRODUCT_IMAGES} fotos de até {MAX_IMAGE_SIZE_MB}MB. A primeira imagem é a principal.
                    </span>
                  </div>
                  {images.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {images.map((image, index) => (
                        <div
                          key={image.id}
                          className={`w-28 rounded-2xl border bg-white p-2 shadow-sm ${
                            index === 0 ? "border-[#17293f]" : "border-slate-200"
                          }`}
                        >
                          <Image
                            src={image.url}
                            alt={image.name}
                            width={96}
                            height={96}
                            unoptimized
                            className="aspect-square w-full rounded-xl object-cover"
                          />
                          <p className="mt-1 truncate text-[10px] text-slate-500">
                            {index === 0 ? "Principal" : `${index + 1}ª foto`}
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                            <button type="button" onClick={() => moveImage(index, "left")} className="rounded bg-slate-100 py-1">
                              ←
                            </button>
                            <button type="button" onClick={() => makeMainImage(index)} className="rounded bg-slate-100 py-1">
                              ★
                            </button>
                            <button type="button" onClick={() => moveImage(index, "right")} className="rounded bg-slate-100 py-1">
                              →
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="mt-1 w-full rounded bg-red-50 py-1 text-[10px] font-bold text-red-600"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <FormField label="URL da imagem" name="imageUrl" placeholder="https://..." />
                <FormField label="Link do YouTube" name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." />
                <SwitchField label="Exibir vídeo na listagem de produtos?" name="showVideoOnListing" />
              </div>
            </div>
          </PanelSection>
        </div>

        <div className={activeStep === "estoque" ? "block" : "hidden"}>
          <PanelSection
            icon="🚚"
            title="Estoque e Envio"
            description="Configure frete, dimensões e controle de estoque."
          >
            <InfoBox>
              Para envios pelos Correios, as dimensões não podem ultrapassar as
              regras de transporte. O valor do envio pode ter pequenas variações.
            </InfoBox>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <SelectField
                label="Tipo de Frete"
                name="freightType"
                value={freightType}
                onChange={(event) => setFreightType(event.target.value)}
                options={[
                  ["correios", "Frete calculado automaticamente pelos Correios"],
                  ["fixo", "Frete fixo"],
                  ["gratis", "Frete grátis"],
                ]}
                className="md:col-span-2"
              />
              {freightType === "correios" ? (
                <>
                  <FormField label="Peso (kg)" name="weight" placeholder="0,000" />
                  <FormField label="Altura (cm)" name="height" placeholder="0" />
                  <FormField label="Largura (cm)" name="width" placeholder="0" />
                  <FormField label="Comprimento/Profundidade (cm)" name="length" placeholder="0" />
                  <MoneyField label="Valor Declarado" name="declaredValue" />
                  <MoneyField label="Valor Somado ao Frete" name="additionalFreight" />
                </>
              ) : null}
              {freightType === "gratis" ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700 md:col-span-3">
                  Frete grátis para este produto. O comprador verá essa informação no produto e no checkout.
                </div>
              ) : null}
              <SwitchField label="Disponibilizar produto sem estoque?" name="allowOutOfStock" />
              <FormField label="Estoque Atual" name="stock" type="number" placeholder="0" />
              <FormField label="Estoque Crítico" name="criticalStock" type="number" placeholder="5" />
            </div>
            {freightType === "fixo" ? (
              <FixedFreightRulesEditor />
            ) : null}
          </PanelSection>
        </div>

        <div className={activeStep === "venda" ? "block" : "hidden"}>
          <PanelSection
            icon="🏪"
            title="Opções de Venda e Exibição"
            description="Defina como este produto aparece na loja."
          >
            <InfoBox>
              Defina opções especiais como destaque, lançamento, prioridade e
              exibição em listagens.
            </InfoBox>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <SwitchField label="Exibir produto no site?" name="showOnSite" defaultChecked />
              <SelectField
                label="Situação"
                name="status"
                options={[
                  ["ACTIVE", "Disponível para venda"],
                  ["INACTIVE", "Inativo"],
                ]}
              />
              <SelectField
                label="Prioridade de Exibição"
                name="priority"
                options={[
                  ["", "Sem prioridade"],
                  ["alta", "Alta"],
                  ["media", "Média"],
                  ["baixa", "Baixa"],
                ]}
              />
              <FormField label="Quantidade mínima por venda" name="minQuantity" type="number" placeholder="1" />
              <SwitchField label="Exibir na página inicial?" name="showOnHome" defaultChecked />
              <SwitchField label="Exibir como lançamento?" name="isLaunch" />
              <SelectField
                label="Produtos recomendados"
                name="recommendedMode"
                options={[
                  ["nenhum", "Não quero recomendar outros produtos na página deste produto"],
                  ["automatico", "Prefiro deixar automática a recomendação entre os produtos"],
                  ["manual", "Quero escolher manualmente quais produtos serão recomendados"],
                ]}
                className="md:col-span-2"
              />
            </div>
          </PanelSection>
        </div>

        <div className={activeStep === "variacoes" ? "block" : "hidden"}>
          <PanelSection
            icon="🔗"
            title="Variações"
            description="Recurso disponível para planos superiores."
          >
            <div className="grid gap-8 p-5 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div className="relative grid min-h-64 place-items-center rounded-3xl bg-slate-50">
                <span className="absolute left-0 top-8 -rotate-45 bg-red-500 px-8 py-2 text-xs font-black text-white">
                  OPÇÃO BLOQUEADA
                </span>
                <div className="text-center text-7xl">👕</div>
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-700">
                  Exclusivo para planos Loja Mais ou superior
                </p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">
                  Variações de Produto
                </h3>
                <p className="mt-4 leading-7 text-slate-600">
                  Apresente seus produtos com variações de cor, tamanho,
                  potência e muito mais. Esse recurso será liberado conforme as
                  regras do plano contratado.
                </p>
                <button type="button" className="mt-6 rounded-xl bg-[#17293f] px-6 py-3 text-sm font-black text-white">
                  Aumentar meu plano
                </button>
              </div>
            </div>
          </PanelSection>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <button type="button" className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white">
            ← Retornar aos primeiros passos
          </button>
          <button
            disabled={isPending}
            className="rounded-xl bg-[#17293f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "✓ Salvar Produto"}
          </button>
        </div>

        {modalType === "save" ? (
          <ConfirmModal
            isPending={isPending}
            onClose={() => setModalType(null)}
            onConfirm={confirmSave}
          />
        ) : null}
        {feedback ? (
          <ActionResultModal
            result={feedback}
            successTitle="Produto salvo com sucesso!"
            errorTitle="Não foi possível salvar o produto"
            onClose={() => setFeedback(null)}
          />
        ) : null}
      </form>
    </div>
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
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-2xl">
          ✓
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          Salvar produto?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Os dados do produto serão cadastrados na sua loja. Deseja continuar?
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
            {isPending ? "Salvando..." : "Sim"}
          </button>
        </div>
      </div>
    </div>
  );
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

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-l-4 border-cyan-500 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
      ℹ️ {children}
    </div>
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

function MoneyField({
  label,
  name,
  required,
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <CurrencyInput
        name={name}
        required={required}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  className = "",
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  className?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
}) {
  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <select
        name={name}
        value={value}
        onChange={onChange}
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

function FixedFreightRulesEditor() {
  const [rules, setRules] = useState<FixedFreightRule[]>([]);
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
          <button
            type="button"
            onClick={saveDraft}
            className="h-12 rounded-xl bg-[#17293f] px-5 text-sm font-black text-white"
          >
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

function SwitchField({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-[#17293f]"
      />
    </label>
  );
}

