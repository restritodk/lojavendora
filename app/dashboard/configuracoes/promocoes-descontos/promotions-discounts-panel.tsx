"use client";

import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  deletePromotionCampaignAction,
  generatePromotionCouponsAction,
  savePromotionCampaignAction,
  togglePromotionCampaignAction,
  type PromotionActionResult,
} from "./actions";

type CampaignRow = {
  id: string;
  type: PromotionCampaignType;
  name: string;
  active: boolean;
  discountType: PromotionDiscountType;
  discountValue: string;
  minOrderValue: string | null;
  minQuantity: number | null;
  startsAt: string | null;
  endsAt: string | null;
  availableFor: string[];
  scope: PromotionScope;
  productIds: string[];
  categoryIds: string[];
  products: string[];
  categories: string[];
  coupons: Array<{
    id: string;
    code: string;
    active: boolean;
    maxUses: number | null;
    usedCount: number;
  }>;
  createdAt: string;
};

const PromotionCampaignType = {
  WHOLESALE_RETAIL: "WHOLESALE_RETAIL",
  ORDER_VALUE_DISCOUNT: "ORDER_VALUE_DISCOUNT",
  COUPON: "COUPON",
} as const;

const PromotionDiscountType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;

const PromotionScope = {
  ALL_PRODUCTS: "ALL_PRODUCTS",
  SELECTED_PRODUCTS: "SELECTED_PRODUCTS",
  SELECTED_CATEGORIES: "SELECTED_CATEGORIES",
} as const;

type PromotionCampaignType = (typeof PromotionCampaignType)[keyof typeof PromotionCampaignType];
type PromotionDiscountType = (typeof PromotionDiscountType)[keyof typeof PromotionDiscountType];
type PromotionScope = (typeof PromotionScope)[keyof typeof PromotionScope];

type OptionRow = {
  id: string;
  name: string;
};

type ProductOption = OptionRow & {
  price: string;
  stock: number;
  customCode: string | null;
};

type PromotionsDiscountsPanelProps = {
  campaigns: CampaignRow[];
  products: ProductOption[];
  categories: OptionRow[];
};

const modules = [
  {
    type: PromotionCampaignType.WHOLESALE_RETAIL,
    title: "Atacado e Varejo",
    subtitle: "Por grupos de produto",
    description: "Crie promoções para quem compra em atacado e separe produtos em grupos com descontos para compras acima da quantidade desejada.",
    button: "Listar Atacado e Varejo",
    icon: "%",
  },
  {
    type: PromotionCampaignType.ORDER_VALUE_DISCOUNT,
    title: "Desconto",
    subtitle: "Por valor da compra",
    description: "Crie descontos que variam de acordo com o total comprado para incentivar compras maiores.",
    button: "Listar Descontos",
    icon: "R$",
  },
  {
    type: PromotionCampaignType.COUPON,
    title: "Cupons de Desconto",
    subtitle: "Por valor da compra",
    description: "Crie grupos de cupons para clientes, com descontos em porcentagem ou em reais.",
    button: "Listar Cupons de Desconto",
    icon: "🎟",
  },
] as const;

export function PromotionsDiscountsPanel({
  campaigns,
  products,
  categories,
}: PromotionsDiscountsPanelProps) {
  const [activeType, setActiveType] = useState<PromotionCampaignType | "home">("home");
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(null);
  const [couponCampaign, setCouponCampaign] = useState<CampaignRow | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    campaign: CampaignRow;
    action: "delete" | "toggle";
  } | null>(null);
  const [feedback, setFeedback] = useState<PromotionActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeModule = modules.find((module) => module.type === activeType);
  const filteredCampaigns = campaigns.filter((campaign) => campaign.type === activeType);

  function submitCampaign(formData: FormData) {
    startTransition(() => {
      void savePromotionCampaignAction(editingCampaign?.id ?? null, formData).then((result) => {
        setFeedback(result);
        if (result.type === "success") {
          setEditingCampaign(null);
        }
      });
    });
  }

  function submitCoupons(formData: FormData) {
    if (!couponCampaign) return;

    startTransition(() => {
      void generatePromotionCouponsAction(couponCampaign.id, formData).then((result) => {
        setFeedback(result);
        if (result.type === "success") {
          setCouponCampaign(null);
        }
      });
    });
  }

  function runConfirmedAction() {
    if (!confirmTarget) return;

    const { campaign, action } = confirmTarget;
    setConfirmTarget(null);
    startTransition(() => {
      const promise = action === "delete"
        ? deletePromotionCampaignAction(campaign.id)
        : togglePromotionCampaignAction(campaign.id);

      void promise.then(setFeedback);
    });
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-[#17293f] px-6 py-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Venda mais</p>
            <h1 className="mt-1 text-2xl font-black">Promoções e Descontos</h1>
            <p className="mt-2 text-sm text-slate-300">
              Crie campanhas, descontos automáticos e cupons por loja.
            </p>
          </div>
          {activeType !== "home" ? (
            <button
              type="button"
              onClick={() => {
                setActiveType("home");
                setEditingCampaign(null);
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white"
            >
              Voltar para opções
            </button>
          ) : null}
        </header>

        {activeType === "home" ? (
          <div className="grid gap-5 p-5">
            {modules.map((module) => (
              <article key={module.type} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <header className="bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
                  {module.title} <span className="font-semibold text-slate-500">( {module.subtitle} )</span>
                </header>
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                  <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-3xl font-black text-cyan-700">
                    {module.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-6 text-slate-600">{module.description}</p>
                    <button
                      type="button"
                      onClick={() => setActiveType(module.type)}
                      className="mt-4 rounded-lg bg-sky-600 px-5 py-2 text-sm font-black text-white"
                    >
                      {module.button}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-l-4 border-cyan-500 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="font-black text-slate-800">{activeModule?.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{activeModule?.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCampaign(emptyCampaign(activeType))}
                className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white"
              >
                + Inserir nova promoção
              </button>
            </div>

            <PromotionList
              campaigns={filteredCampaigns}
              onEdit={setEditingCampaign}
              onCoupons={setCouponCampaign}
              onConfirm={(campaign, action) => setConfirmTarget({ campaign, action })}
            />
          </div>
        )}
      </section>

      {editingCampaign ? (
        <PromotionFormModal
          campaign={editingCampaign}
          products={products}
          categories={categories}
          isPending={isPending}
          onClose={() => setEditingCampaign(null)}
          onSubmit={submitCampaign}
        />
      ) : null}

      {couponCampaign ? (
        <CouponModal
          campaign={couponCampaign}
          isPending={isPending}
          onClose={() => setCouponCampaign(null)}
          onSubmit={submitCoupons}
        />
      ) : null}

      {confirmTarget ? (
        <ConfirmDialog
          title={confirmTarget.action === "delete" ? "Excluir promoção?" : "Alterar status?"}
          message={
            confirmTarget.action === "delete"
              ? `A promoção "${confirmTarget.campaign.name}" será removida.`
              : `Deseja ${confirmTarget.campaign.active ? "desativar" : "ativar"} esta promoção?`
          }
          onCancel={() => setConfirmTarget(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Tudo certo!"
          errorTitle="Atenção"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function PromotionList({
  campaigns,
  onEdit,
  onCoupons,
  onConfirm,
}: {
  campaigns: CampaignRow[];
  onEdit: (campaign: CampaignRow) => void;
  onCoupons: (campaign: CampaignRow) => void;
  onConfirm: (campaign: CampaignRow, action: "delete" | "toggle") => void;
}) {
  if (campaigns.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div>
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-slate-100 text-3xl">📋</div>
          <h3 className="mt-4 font-black text-slate-800">Nenhum item encontrado!</h3>
          <p className="mt-2 text-sm text-slate-500">Você ainda não possui conteúdo cadastrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Promoção</th>
            <th className="px-4 py-3">Desconto</th>
            <th className="px-4 py-3">Escopo</th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3">Cupons</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td className="px-5 py-4">
                <strong className="text-slate-900">{campaign.name}</strong>
                <p className="mt-1 text-xs text-slate-500">{campaign.availableFor.join(", ")}</p>
              </td>
              <td className="px-4 py-4 font-bold text-slate-700">{formatDiscount(campaign)}</td>
              <td className="px-4 py-4 text-slate-600">{scopeLabel(campaign)}</td>
              <td className="px-4 py-4 text-xs text-slate-500">{periodLabel(campaign)}</td>
              <td className="px-4 py-4 text-slate-600">{campaign.coupons.length}</td>
              <td className="px-4 py-4">
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  campaign.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {campaign.active ? "Ativa" : "Inativa"}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {campaign.type === PromotionCampaignType.COUPON ? (
                    <button type="button" onClick={() => onCoupons(campaign)} className="rounded-lg border px-3 py-2 font-bold text-cyan-700">
                      Cupons
                    </button>
                  ) : null}
                  <button type="button" onClick={() => onEdit(campaign)} className="rounded-lg border px-3 py-2 font-bold text-slate-700">
                    Editar
                  </button>
                  <button type="button" onClick={() => onConfirm(campaign, "toggle")} className="rounded-lg border px-3 py-2 font-bold text-slate-700">
                    {campaign.active ? "Desativar" : "Ativar"}
                  </button>
                  <button type="button" onClick={() => onConfirm(campaign, "delete")} className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-700">
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromotionFormModal({
  campaign,
  products,
  categories,
  isPending,
  onClose,
  onSubmit,
}: {
  campaign: CampaignRow;
  products: ProductOption[];
  categories: OptionRow[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [scope, setScope] = useState(campaign.scope);
  const [couponCode, setCouponCode] = useState(campaign.coupons[0]?.code ?? "");
  const [selectedProductIds, setSelectedProductIds] = useState(campaign.productIds);
  const isCoupon = campaign.type === PromotionCampaignType.COUPON;
  const isWholesale = campaign.type === PromotionCampaignType.WHOLESALE_RETAIL;
  const isOrderDiscount = campaign.type === PromotionCampaignType.ORDER_VALUE_DISCOUNT;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 px-4 py-6">
      <form action={onSubmit} className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between bg-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">{campaign.id ? "Editar promoção" : "Nova promoção"}</h2>
            <p className="text-sm text-slate-500">{typeLabel(campaign.type)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-3xl font-black text-slate-500">×</button>
        </header>

        <div className="grid gap-6 overflow-y-auto p-6">
          <input type="hidden" name="type" value={campaign.type} />
          <section className="rounded-2xl border border-slate-200">
            <header className="bg-slate-50 px-5 py-3 font-black text-slate-700">Informações gerais</header>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-600">Nome para referência</span>
                <input name="name" defaultValue={campaign.name} className="h-11 rounded-xl border border-slate-200 px-4" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-600">Ativar promoção</span>
                <select name="active" defaultValue={String(campaign.active)} className="h-11 rounded-xl border border-slate-200 px-4">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-600">Tipo de desconto</span>
                <select name="discountType" defaultValue={campaign.discountType} className="h-11 rounded-xl border border-slate-200 px-4">
                  <option value={PromotionDiscountType.PERCENTAGE}>Porcentagem (%)</option>
                  <option value={PromotionDiscountType.FIXED_AMOUNT}>Dinheiro (R$)</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-600">Desconto</span>
                <input name="discountValue" defaultValue={campaign.discountValue} className="h-11 rounded-xl border border-slate-200 px-4" />
              </label>
              {isWholesale ? (
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-600">A partir de produtos</span>
                  <input name="minQuantity" type="number" min={1} defaultValue={campaign.minQuantity ?? 1} className="h-11 rounded-xl border border-slate-200 px-4" />
                </label>
              ) : null}
              {(isOrderDiscount || isCoupon) ? (
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-600">A partir de reais</span>
                  <input name="minOrderValue" defaultValue={campaign.minOrderValue ?? "0"} className="h-11 rounded-xl border border-slate-200 px-4" />
                </label>
              ) : null}
              <DateTimeField label="Data de início" name="startsAt" value={campaign.startsAt} />
              <DateTimeField label="Data de término" name="endsAt" value={campaign.endsAt} />
              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-600">Disponível para</span>
                <div className="flex flex-wrap gap-4">
                  {["Pessoa Física", "Pessoa Jurídica"].map((personType) => (
                    <label key={personType} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        name="availableFor"
                        value={personType}
                        defaultChecked={campaign.availableFor.length === 0 || campaign.availableFor.includes(personType)}
                        className="size-4 accent-cyan-700"
                      />
                      {personType}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200">
            <header className="bg-slate-50 px-5 py-3 font-black text-slate-700">Cupom da promoção</header>
            <div className="grid gap-4 p-5 md:grid-cols-[minmax(220px,360px)_96px_160px]">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-600">Código do cupom</span>
                <input
                  name="couponCode"
                  value={couponCode}
                  onChange={(event) => setCouponCode(sanitizeCouponCode(event.target.value))}
                  placeholder="Ex: PROMO10"
                  maxLength={24}
                  className="h-11 rounded-xl border border-slate-200 px-4 font-bold uppercase"
                />
              </label>
              <button
                type="button"
                onClick={() => setCouponCode(randomCouponCode())}
                className="self-end rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white"
              >
                Gerar
              </button>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-600">Limite de usos</span>
                <input
                  name="couponMaxUses"
                  type="number"
                  min={1}
                  defaultValue={campaign.coupons[0]?.maxUses ?? ""}
                  placeholder="Sem limite"
                  className="h-11 rounded-xl border border-slate-200 px-4"
                />
              </label>
              <p className="text-sm leading-6 text-slate-500 md:col-span-3">
                Use somente letras e números. O cupom seguirá as regras desta promoção no checkout da loja.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200">
            <header className="bg-slate-50 px-5 py-3 font-black text-slate-700">Utilização da promoção</header>
            <div className="grid gap-5 p-5">
              <div className="flex flex-wrap gap-4">
                {[
                  { value: PromotionScope.ALL_PRODUCTS, label: "Todos os produtos" },
                  { value: PromotionScope.SELECTED_PRODUCTS, label: "Escolher produtos" },
                  { value: PromotionScope.SELECTED_CATEGORIES, label: "Escolher categorias de produtos" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="radio"
                      name="scope"
                      value={option.value}
                      checked={scope === option.value}
                      onChange={() => setScope(option.value)}
                      className="size-4 accent-cyan-700"
                    />
                    {option.label}
                  </label>
                ))}
              </div>

              {scope === PromotionScope.SELECTED_PRODUCTS ? (
                <ProductSearchSelector
                  products={products}
                  selectedProductIds={selectedProductIds}
                  onChange={setSelectedProductIds}
                />
              ) : null}
              {scope === PromotionScope.SELECTED_CATEGORIES ? (
                <SelectorGrid name="categoryIds" options={categories} selected={campaign.categoryIds} />
              ) : null}
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-600 px-6 py-3 text-sm font-black text-white">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-black text-white">
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function CouponModal({
  campaign,
  isPending,
  onClose,
  onSubmit,
}: {
  campaign: CampaignRow;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [mode, setMode] = useState("random");

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/70 px-4 py-6">
      <form action={onSubmit} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between bg-slate-100 px-5 py-3">
          <h2 className="font-black text-slate-700">Inserir Cupom</h2>
          <button type="button" onClick={onClose} className="text-2xl font-black text-slate-500">×</button>
        </header>
        <div className="grid gap-5 overflow-y-auto p-6">
          <p className="rounded-2xl border-l-4 border-cyan-500 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Selecione o tipo de cupom desejado e preencha os dados referentes ao grupo {campaign.name}.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: "random", label: "Sequência de cupons aleatória" },
              { id: "same", label: "Cupons iguais" },
              { id: "manual", label: "Personalizados" },
            ].map((option) => (
              <label key={option.id} className={`rounded-2xl border p-4 text-center text-sm font-black ${mode === option.id ? "border-lime-500 bg-lime-50 text-lime-800" : "border-slate-200 text-slate-500"}`}>
                <input type="radio" name="mode" value={option.id} checked={mode === option.id} onChange={() => setMode(option.id)} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
          {mode !== "manual" ? (
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-600">Quantidade</span>
              <input name="quantity" type="number" min={1} defaultValue={1} className="h-11 rounded-xl border border-slate-200 px-4" />
            </label>
          ) : null}
          {mode === "same" ? (
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-600">Código da Promoção</span>
              <input name="code" placeholder="001" className="h-11 rounded-xl border border-slate-200 px-4 uppercase" />
            </label>
          ) : null}
          {mode === "manual" ? (
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-600">Códigos manuais</span>
              <textarea name="manualCodes" placeholder="Um código por linha" className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 uppercase" />
            </label>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-600">Limite de usos por cupom</span>
            <input name="maxUses" type="number" min={1} placeholder="Sem limite" className="h-11 rounded-xl border border-slate-200 px-4" />
          </label>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="submit" disabled={isPending} className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-black text-white">
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SelectorGrid({
  name,
  options,
  selected,
}: {
  name: string;
  options: OptionRow[];
  selected: string[];
}) {
  return (
    <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
          <input type="checkbox" name={name} value={option.id} defaultChecked={selected.includes(option.id)} className="size-4 accent-cyan-700" />
          {option.name}
        </label>
      ))}
    </div>
  );
}

function ProductSearchSelector({
  products,
  selectedProductIds,
  onChange,
}: {
  products: ProductOption[];
  selectedProductIds: string[];
  onChange: (productIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));
  const results = normalizedQuery.length >= 3
    ? products
        .filter((product) => !selectedProductIds.includes(product.id))
        .filter((product) => {
          const haystack = normalizeSearch(`${product.customCode ?? ""} ${product.name}`);
          return haystack.includes(normalizedQuery);
        })
        .slice(0, 8)
    : [];

  function addProduct(productId: string) {
    if (selectedProductIds.includes(productId)) {
      return;
    }

    onChange([...selectedProductIds, productId]);
    setQuery("");
  }

  function removeProduct(productId: string) {
    onChange(selectedProductIds.filter((id) => id !== productId));
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
      {selectedProductIds.map((productId) => (
        <input key={productId} type="hidden" name="productIds" value={productId} />
      ))}
      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-600">Pesquisar produto por código ou nome</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Digite pelo menos 3 letras ou números"
          className="h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-cyan-500"
        />
      </label>

      {query.trim().length > 0 && normalizedQuery.length < 3 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          Digite pelo menos 3 caracteres para listar produtos.
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-2">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addProduct(product.id)}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              <span>
                <span className="block text-sm font-black text-slate-800">{product.name}</span>
                <span className="text-xs font-semibold text-slate-500">
                  Código: {product.customCode || product.id.slice(0, 8)} • Estoque: {product.stock}
                </span>
              </span>
              <span className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black text-white">
                Adicionar
              </span>
            </button>
          ))}
        </div>
      ) : normalizedQuery.length >= 3 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Nenhum produto encontrado para essa busca.
        </p>
      ) : null}

      <div className="grid gap-2">
        <h4 className="text-sm font-black text-slate-700">
          Produtos selecionados ({selectedProducts.length})
        </h4>
        {selectedProducts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm font-semibold text-slate-400">
            Nenhum produto selecionado ainda.
          </p>
        ) : (
          selectedProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <span>
                <span className="block text-sm font-black text-slate-800">{product.name}</span>
                <span className="text-xs font-semibold text-slate-500">
                  Código: {product.customCode || product.id.slice(0, 8)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700"
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DateTimeField({ label, name, value }: { label: string; name: string; value: string | null }) {
  const date = value ? value.slice(0, 10) : "";
  const time = value ? value.slice(11, 16) : "00:00";

  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <div className="flex gap-2">
        <input type="date" name={`${name}Date`} defaultValue={date} className="h-11 flex-1 rounded-xl border border-slate-200 px-4" />
        <input type="time" name={`${name}Time`} defaultValue={time} className="h-11 w-32 rounded-xl border border-slate-200 px-4" />
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-[#17293f] px-4 py-3 text-sm font-black text-white">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyCampaign(type: PromotionCampaignType): CampaignRow {
  return {
    id: "",
    type,
    name: "",
    active: true,
    discountType: PromotionDiscountType.PERCENTAGE,
    discountValue: "0",
    minOrderValue: type === PromotionCampaignType.ORDER_VALUE_DISCOUNT || type === PromotionCampaignType.COUPON ? "0" : null,
    minQuantity: type === PromotionCampaignType.WHOLESALE_RETAIL ? 1 : null,
    startsAt: null,
    endsAt: null,
    availableFor: ["Pessoa Física", "Pessoa Jurídica"],
    scope: PromotionScope.ALL_PRODUCTS,
    productIds: [],
    categoryIds: [],
    products: [],
    categories: [],
    coupons: [],
    createdAt: new Date().toISOString(),
  };
}

function randomCouponCode() {
  return sanitizeCouponCode(`PROMO${Math.random().toString(36).slice(2, 8)}`);
}

function sanitizeCouponCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDiscount(campaign: CampaignRow) {
  return campaign.discountType === PromotionDiscountType.PERCENTAGE
    ? `${campaign.discountValue}%`
    : formatCurrency(Number(campaign.discountValue));
}

function scopeLabel(campaign: CampaignRow) {
  if (campaign.scope === PromotionScope.ALL_PRODUCTS) return "Todos os produtos";
  if (campaign.scope === PromotionScope.SELECTED_PRODUCTS) return campaign.products.join(", ") || "Produtos selecionados";
  return campaign.categories.join(", ") || "Categorias selecionadas";
}

function periodLabel(campaign: CampaignRow) {
  const start = campaign.startsAt ? formatDate(campaign.startsAt) : "Sem início";
  const end = campaign.endsAt ? formatDate(campaign.endsAt) : "Sem término";
  return `${start} até ${end}`;
}

function typeLabel(type: PromotionCampaignType) {
  return modules.find((module) => module.type === type)?.title ?? "Promoção";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

