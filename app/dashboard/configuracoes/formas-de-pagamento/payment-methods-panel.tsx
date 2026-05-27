"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { FieldLabel } from "@/components/dashboard/field-help";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  savePaymentMethodAction,
  type PaymentMethodResult,
} from "./actions";

type PlanRequirement = "free" | "inicial" | "mais";
type PaymentValues = Record<string, string | string[]>;

type PaymentMethod = {
  id: string;
  title: string;
  icon: string;
  plan: PlanRequirement;
  badge?: string;
  defaultActive?: boolean;
};

type StoredPaymentSetting = {
  featureId: string;
  active: boolean;
  values: PaymentValues;
};

const planRank = {
  "loja-gratis": 0,
  "loja-inicial": 1,
  "loja-mais": 2,
  "loja-completa": 3,
  "loja-ilimitada": 4,
};

const requirementRank = {
  free: 0,
  inicial: 1,
  mais: 2,
};

const paymentMethods: PaymentMethod[] = [
  method("customizado", "Pagamento Personalizado", "customizado.png", "free", undefined, true),
  method("pix-deposito", "PIX / Depósito Bancário", "deposito.png", "free"),
  method("pagseguro-transparente", "Cartão de Crédito Pagseguro (Transparente)", "pagseguro_transparente.png", "mais", "Mais Utilizado"),
  method("pagseguro", "PagSeguro (UOL)", "pagseguro.png", "mais", "Mais Utilizado"),
  method("paghiper", "Boleto PagHiper", "paghiper.png", "mais", "Mais Utilizado"),
  method("paypal", "PayPal Checkout", "paypal_grande.png", "mais"),
  method("mercado-pago", "Mercado Pago", "mercado_pago.png", "mais"),
  method("f2b", "F2b", "f2b.png", "mais"),
  method("mercado-pago-transparente", "Mercado Pago Transparente", "mercado_pago_api.png", "mais"),
  method("boletos", "Boletos Bancários / Webservices", "boleto.png", "mais"),
  method("cielo", "Cielo (Cartões)", "cielo_integrado.png", "mais", "Melhores Taxas"),
  method("rede", "E-Rede", "rede.png", "mais"),
  method("picpay", "PicPay", "picpay.png", "mais"),
  method("pagarme", "Pagar.me", "pagarme.png", "mais"),
  method("wirecard", "Wirecard", "wirecard.png", "mais"),
  method("cielo-transparente", "Cielo Transparente 3.0", "cielo.png", "mais", "Melhores Taxas"),
];

const apiGatewayIds = new Set([
  "mercado-pago",
  "mercado-pago-transparente",
  "pagseguro",
  "pagseguro-transparente",
  "cielo",
  "cielo-transparente",
  "rede",
  "pagarme",
  "picpay",
  "paghiper",
  "paypal",
  "f2b",
  "boletos",
  "wirecard",
]);

export function PaymentMethodsPanel({
  planSlug,
  initialSettings,
}: {
  planSlug: string;
  initialSettings: StoredPaymentSetting[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [feedback, setFeedback] = useState<PaymentMethodResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const settingsByFeature = useMemo(
    () => new Map(settings.map((setting) => [setting.featureId, setting])),
    [settings],
  );

  function savePaymentMethod(paymentMethod: PaymentMethod, formData: FormData) {
    setFeedback(null);

    startTransition(async () => {
      const result = await savePaymentMethodAction(paymentMethod.id, formData);

      if (result.type === "success") {
        const active = formData.get("__active") === "true";
        const values = collectValues(formData);

        setSettings((current) =>
          upsertSetting(current, {
            featureId: `payment:${paymentMethod.id}`,
            active,
            values,
          }),
        );
        setSelectedMethod(null);
      }

      setFeedback(result);
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-[#dddddd] px-5 py-4">
          <span className="text-xl">💳</span>
          <h1 className="font-bold text-slate-700">Formas de Pagamento</h1>
        </header>

        <div className="m-3 flex items-center justify-between rounded border-l-4 border-cyan-400 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cyan-400 text-2xl font-black italic text-white">
              i
            </span>
            <p className="text-sm leading-6 text-slate-500">
              As formas de pagamento são os meios com que seus clientes irão lhe
              pagar na loja virtual. Para efetuar vendas, configure corretamente
              pelo menos uma forma de pagamento. Cada configuração pertence
              somente à loja atual, e apenas formas ativas e configuradas serão
              exibidas no checkout do site do cliente.
            </p>
          </div>
          <span className="text-2xl font-black text-slate-600">×</span>
        </div>

        <div className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paymentMethods.map((paymentMethod) => {
            const stored = settingsByFeature.get(`payment:${paymentMethod.id}`);
            const active = stored?.active ?? paymentMethod.defaultActive ?? false;
            const locked = !canUsePayment(planSlug, paymentMethod.plan);

            return (
              <PaymentCard
                key={paymentMethod.id}
                paymentMethod={paymentMethod}
                active={active}
                locked={locked}
                onOpen={() => setSelectedMethod(paymentMethod)}
              />
            );
          })}
        </div>
      </section>

      {selectedMethod ? (
        <PaymentMethodModal
          paymentMethod={selectedMethod}
          values={settingsByFeature.get(`payment:${selectedMethod.id}`)?.values ?? {}}
          active={
            settingsByFeature.get(`payment:${selectedMethod.id}`)?.active ??
            selectedMethod.defaultActive ??
            false
          }
          isPending={isPending}
          onClose={() => setSelectedMethod(null)}
          onSave={(formData) => savePaymentMethod(selectedMethod, formData)}
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
              {feedback.type === "success" ? "Pagamento salvo!" : "Não foi possível salvar"}
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

function PaymentMethodModal({
  paymentMethod,
  values,
  active,
  isPending,
  onClose,
  onSave,
}: {
  paymentMethod: PaymentMethod;
  values: PaymentValues;
  active: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  if (paymentMethod.id === "pix-deposito") {
    return (
      <PixDepositModal
        values={values}
        active={active}
        isPending={isPending}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }

  if (apiGatewayIds.has(paymentMethod.id)) {
    return (
      <GatewayPaymentModal
        paymentMethod={paymentMethod}
        values={values}
        active={active}
        isPending={isPending}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }

  if (paymentMethod.id !== "customizado") {
    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 px-4">
        <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
            <h2 className="text-xl font-black text-slate-700">{paymentMethod.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-4xl font-black leading-none text-slate-600"
            >
              ×
            </button>
          </header>
          <div className="p-6">
            <div className="flex gap-4 rounded-lg bg-slate-50 p-4 text-slate-500">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-500 text-2xl font-black text-white">
                i
              </span>
              <p className="text-base leading-7">
                Esta forma de pagamento será configurada em uma próxima etapa,
                sempre salva apenas para a loja autenticada.
              </p>
            </div>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-100 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-600 px-8 py-3 text-sm font-black text-white"
            >
              Fechar
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 px-4 py-8">
      <form action={onSave} className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <h2 className="text-xl font-black text-slate-700">Pagamento Customizado</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-4xl font-black leading-none text-slate-600"
          >
            ×
          </button>
        </header>

        <div className="grid gap-6 p-6">
          <div className="flex gap-4 rounded-lg border-l-4 border-cyan-400 bg-slate-50 p-4 text-slate-500">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-500 text-2xl font-black italic text-white">
              i
            </span>
            <p className="text-sm leading-6">
              O Pagamento Personalizado é ideal para oferecer pagamento no
              recebimento do produto, como envio por motoboy, retirar na loja,
              delivery, entregar em mãos ou quando a venda precisa de contato
              prévio. O cliente realiza o pedido na loja, mas não efetua o
              pagamento de imediato.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <label className="grid gap-2">
              <FieldLabel help="Nome exibido ao comprador no checkout.">
                Título do pagamento
              </FieldLabel>
              <input
                name="title"
                defaultValue={getStringValue(values.title, "Pagamento em mãos")}
                placeholder="Ex: Pagamento em mãos"
                className="h-11 rounded border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>

            <ToggleField
              name="__active"
              label="Exibir forma de pagamento na loja"
              help="Quando ativo, esta forma poderá aparecer no checkout da loja atual."
              defaultChecked={active}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ToggleField
              name="enabledForCheckout"
              label="Ativar forma de pagamento"
              help="Mantém a forma disponível para uso no checkout da loja."
              defaultChecked={getBooleanValue(values.enabledForCheckout, true)}
            />

            <label className="grid gap-2">
              <FieldLabel help="Controla a ordem de exibição no checkout.">
                Prioridade de exibição
              </FieldLabel>
              <select
                name="priority"
                defaultValue={getStringValue(values.priority, "Muito pouca")}
                className="h-11 rounded border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-cyan-500"
              >
                <option>Muito pouca</option>
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
                <option>Muito alta</option>
              </select>
            </label>

            <label className="grid gap-2">
              <FieldLabel help="Percentual adicional somado ao pedido ao escolher esta forma.">
                Porcentagem adicional
              </FieldLabel>
              <div className="flex h-11 overflow-hidden rounded border border-slate-200 bg-white">
                <input
                  name="additionalPercent"
                  defaultValue={getStringValue(values.additionalPercent, "0,00")}
                  inputMode="decimal"
                  className="min-w-0 flex-1 px-4 text-sm outline-none"
                />
                <span className="grid w-11 place-items-center border-l border-slate-200 bg-slate-100 text-sm font-bold text-slate-500">
                  %
                </span>
              </div>
            </label>

            <label className="grid gap-2">
              <FieldLabel help="Valor fixo adicional somado ao pedido ao escolher esta forma.">
                Valor adicional
              </FieldLabel>
              <div className="flex h-11 overflow-hidden rounded border border-slate-200 bg-white">
                <span className="grid w-12 place-items-center border-r border-slate-200 bg-slate-100 text-sm font-bold text-slate-500">
                  R$
                </span>
                <CurrencyInput
                  name="additionalValue"
                  defaultValue={getStringValue(values.additionalValue, "0.00")}
                  className="min-w-0 flex-1 px-4 text-sm outline-none"
                />
              </div>
            </label>
          </div>

          <fieldset className="grid gap-2">
            <FieldLabel help="Define para quais tipos de comprador esta forma será exibida.">
              Disponível para
            </FieldLabel>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
              <Checkbox
                name="availableFor"
                value="Pessoa Física"
                label="Pessoa Física"
                defaultChecked={getArrayValue(values.availableFor, ["Pessoa Física", "Pessoa Jurídica"]).includes("Pessoa Física")}
              />
              <Checkbox
                name="availableFor"
                value="Pessoa Jurídica"
                label="Pessoa Jurídica"
                defaultChecked={getArrayValue(values.availableFor, ["Pessoa Física", "Pessoa Jurídica"]).includes("Pessoa Jurídica")}
              />
            </div>
          </fieldset>

          <label className="grid gap-2">
            <FieldLabel help="Mensagem exibida no checkout para orientar o comprador.">
              Descrição na compra
            </FieldLabel>
            <textarea
              name="checkoutDescription"
              defaultValue={getStringValue(values.checkoutDescription)}
              className="min-h-44 rounded border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500"
              placeholder="Ex: O pagamento será combinado após a confirmação do pedido."
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel help="Mensagem complementar que poderá aparecer no produto ou resumo da compra.">
              Descrição no produto
            </FieldLabel>
            <textarea
              name="productDescription"
              defaultValue={getStringValue(values.productDescription)}
              className="min-h-36 rounded border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500"
            />
          </label>
        </div>

        <footer className="flex flex-wrap justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-600 px-8 py-3 text-sm font-black text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-green-600 px-8 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function GatewayPaymentModal({
  paymentMethod,
  values,
  active,
  isPending,
  onClose,
  onSave,
}: {
  paymentMethod: PaymentMethod;
  values: PaymentValues;
  active: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 px-4 py-8">
      <form action={onSave} className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
        <input type="hidden" name="gatewayId" value={paymentMethod.id} />
        <input type="hidden" name="gatewayName" value={paymentMethod.title} />
        <header className="flex items-center justify-between bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              Gateway de pagamento
            </p>
            <h2 className="mt-1 text-2xl font-black">{paymentMethod.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-3xl font-black leading-none">
            ×
          </button>
        </header>

        <div className="grid gap-6 p-6">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-900">
            Configure as credenciais do gateway. As chaves ficam salvas apenas no backend da loja e nunca são enviadas ao checkout público.
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2">
              <FieldLabel help="Ative somente quando as credenciais estiverem corretas.">Status</FieldLabel>
              <select
                name="__active"
                defaultValue={active ? "true" : "false"}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
              >
                <option value="true">Ativo no site</option>
                <option value="false">Inativo no site</option>
              </select>
            </label>
            <InputLike name="title" label="Título no checkout" values={values} defaultValue={paymentMethod.title} />
            <label className="grid gap-2">
              <FieldLabel help="Use sandbox para testes e produção apenas com credenciais reais.">Ambiente</FieldLabel>
              <select
                name="environment"
                defaultValue={getStringValue(values.environment, "sandbox")}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
              >
                <option value="sandbox">Teste / Sandbox</option>
                <option value="production">Produção</option>
              </select>
            </label>
            <InputLike name="publicKey" label="Chave pública / Client ID" values={values} />
            <InputLike name="secretKey" label="Chave secreta / Access token" values={values} type="password" />
            <InputLike name="merchantId" label="Merchant ID / Seller ID" values={values} />
            <InputLike name="clientSecret" label="Client Secret" values={values} type="password" />
            <InputLike name="webhookSecret" label="Segredo do webhook" values={values} type="password" />
            <InputLike name="priority" label="Prioridade no checkout" values={values} defaultValue="10" />
          </div>

          <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <FieldLabel help="Define quais opções aparecerão no checkout público desta loja.">
              Métodos habilitados
            </FieldLabel>
            <div className="grid gap-3 text-sm font-semibold text-slate-600 md:grid-cols-3">
              <Checkbox
                name="enabledMethods"
                value="pix"
                label="PIX via API"
                defaultChecked={getArrayValue(values.enabledMethods, []).includes("pix")}
              />
              <Checkbox
                name="enabledMethods"
                value="credit"
                label="Cartão de crédito"
                defaultChecked={getArrayValue(values.enabledMethods, []).includes("credit")}
              />
              <Checkbox
                name="enabledMethods"
                value="debit"
                label="Cartão de débito"
                defaultChecked={getArrayValue(values.enabledMethods, []).includes("debit")}
              />
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <InputLike name="checkoutDescription" label="Descrição no checkout" values={values} />
            <InputLike name="statementDescriptor" label="Nome na fatura/extrato" values={values} />
          </div>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600">
            Cancelar
          </button>
          <button disabled={isPending} className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-black text-white disabled:bg-slate-300">
            {isPending ? "Salvando..." : "Salvar configuração"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function PixDepositModal({
  values,
  active,
  isPending,
  onClose,
  onSave,
}: {
  values: PaymentValues;
  active: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 px-4 py-8">
      <form action={onSave} className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <h2 className="text-xl font-black text-slate-700">Depósito Bancário / PIX</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-4xl font-black leading-none text-slate-600"
          >
            ×
          </button>
        </header>

        <div className="grid gap-6 p-6">
          <div className="flex gap-4 rounded-lg border-l-4 border-cyan-400 bg-slate-50 p-4 text-slate-500">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-500 text-2xl font-black italic text-white">
              i
            </span>
            <p className="text-sm leading-6">
              Configure os dados de PIX ou depósito bancário que serão exibidos no checkout.
              Após o comprador enviar o comprovante, o pedido ficará aguardando a confirmação
              do lojista antes de seguir o fluxo normal de envio.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <label className="grid gap-2">
              <FieldLabel help="Nome exibido ao comprador no checkout.">
                Título do pagamento
              </FieldLabel>
              <input
                name="title"
                defaultValue={getStringValue(values.title, "Transferência Pix")}
                className="h-11 rounded border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <ToggleField
              name="__active"
              label="Exibir forma de pagamento na loja"
              help="Quando ativo, esta forma aparecerá no checkout da loja atual."
              defaultChecked={active}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ToggleField
              name="enabledForCheckout"
              label="Ativar forma de pagamento"
              help="Mantém PIX/Depósito disponível para o comprador."
              defaultChecked={getBooleanValue(values.enabledForCheckout, true)}
            />
            <div className="rounded border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
              O QR Code e o PIX copia e cola serão gerados automaticamente com o valor do pedido.
            </div>
            <label className="grid gap-2">
              <FieldLabel help="Controla a ordem de exibição no checkout.">
                Prioridade de exibição
              </FieldLabel>
              <select
                name="priority"
                defaultValue={getStringValue(values.priority, "Muito pouca")}
                className="h-11 rounded border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-cyan-500"
              >
                <option>Muito pouca</option>
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
                <option>Muito alta</option>
              </select>
            </label>
            <label className="grid gap-2">
              <FieldLabel help="Escolha se será Pix, depósito bancário ou ambos.">
                Tipo
              </FieldLabel>
              <select
                name="paymentKind"
                defaultValue={getStringValue(values.paymentKind, "PIX")}
                className="h-11 rounded border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-cyan-500"
              >
                <option>PIX</option>
                <option>Depósito bancário</option>
                <option>PIX e Depósito bancário</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2">
              <FieldLabel help="Tipo da chave Pix configurada.">Tipo da chave</FieldLabel>
              <select
                name="pixKeyType"
                defaultValue={getStringValue(values.pixKeyType, "E-mail")}
                className="h-11 rounded border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-cyan-500"
              >
                <option>E-mail</option>
                <option>CPF</option>
                <option>CNPJ</option>
                <option>Telefone</option>
                <option>Chave aleatória</option>
              </select>
            </label>
            <InputLike name="pixKey" label="Chave PIX" values={values} />
            <InputLike name="beneficiaryName" label="Nome do beneficiário" values={values} />
            <InputLike name="bankName" label="Banco" values={values} />
            <InputLike name="agency" label="Agência" values={values} />
            <InputLike name="account" label="Conta" values={values} />
            <InputLike name="merchantCity" label="Cidade do beneficiário" values={values} />
          </div>

          <fieldset className="grid gap-2">
            <FieldLabel help="Define para quais tipos de comprador esta forma será exibida.">
              Disponível para
            </FieldLabel>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
              <Checkbox
                name="availableFor"
                value="Pessoa Física"
                label="Pessoa Física"
                defaultChecked={getArrayValue(values.availableFor, ["Pessoa Física", "Pessoa Jurídica"]).includes("Pessoa Física")}
              />
              <Checkbox
                name="availableFor"
                value="Pessoa Jurídica"
                label="Pessoa Jurídica"
                defaultChecked={getArrayValue(values.availableFor, ["Pessoa Física", "Pessoa Jurídica"]).includes("Pessoa Jurídica")}
              />
            </div>
          </fieldset>

          <label className="grid gap-2">
            <FieldLabel help="Mensagem exibida no checkout para orientar o comprador.">
              Informações adicionais
            </FieldLabel>
            <textarea
              name="checkoutDescription"
              defaultValue={getStringValue(values.checkoutDescription, "Após efetuar o PIX ou depósito, envie o comprovante para análise da loja.")}
              className="min-h-36 rounded border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500"
            />
          </label>
        </div>

        <footer className="flex flex-wrap justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-600 px-8 py-3 text-sm font-black text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-green-600 px-8 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function PaymentCard({
  paymentMethod,
  active,
  locked,
  onOpen,
}: {
  paymentMethod: PaymentMethod;
  active: boolean;
  locked: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      className={`relative flex min-h-[145px] flex-col items-center overflow-hidden rounded border bg-white px-4 py-3 text-center shadow-sm transition ${
        active
          ? "border-emerald-500 ring-2 ring-emerald-100"
          : "border-slate-300 hover:border-cyan-300"
      } ${locked ? "bg-slate-50" : ""}`}
    >
      <span
        aria-label={active ? "Ativo no site" : "Inativo no site"}
        title={active ? "Ativo no site" : "Inativo no site"}
        className={`absolute left-0 top-0 h-16 w-16 ${
          active ? "bg-emerald-600" : "bg-slate-300"
        } [clip-path:polygon(0_0,100%_0,0_100%)]`}
      />
      <span className="absolute left-3 top-2 text-xl font-black leading-none text-white drop-shadow-sm">
        ✓
      </span>

      {paymentMethod.badge ? (
        <span className="absolute right-[-46px] top-5 z-10 w-44 rotate-45 bg-cyan-500 py-1.5 text-center text-[9px] font-black uppercase tracking-wide text-white shadow-md ring-1 ring-cyan-300">
          {paymentMethod.badge}
        </span>
      ) : null}

      <div className="grid min-h-16 w-full place-items-center">
        <Image
          src={`/api/payment-icons/${paymentMethod.icon}`}
          alt=""
          width={150}
          height={64}
          className="max-h-16 w-auto object-contain"
        />
      </div>

      <p className="mt-2 min-h-8 text-xs leading-4 text-slate-600">
        {paymentMethod.title}
      </p>

      <button
        type="button"
        onClick={onOpen}
        className={`mt-auto rounded border px-4 py-1 text-[11px] font-semibold transition ${
          locked
            ? "border-cyan-300 bg-white text-cyan-600"
            : active
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
        }`}
      >
        {locked ? "Disponível para plano superior" : active ? "Ativo no site" : "Inativo no site"}
      </button>
    </article>
  );
}

function method(
  id: string,
  title: string,
  icon: string,
  plan: PlanRequirement,
  badge?: string,
  defaultActive = false,
): PaymentMethod {
  return { id, title, icon, plan, badge, defaultActive };
}

function canUsePayment(planSlug: string, requirement: PlanRequirement) {
  const currentRank = planRank[planSlug as keyof typeof planRank] ?? 0;
  return currentRank >= requirementRank[requirement];
}

function ToggleField({
  name,
  label,
  help,
  defaultChecked,
}: {
  name: string;
  label: string;
  help: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="grid gap-2">
      <FieldLabel help={help}>{label}</FieldLabel>
      <input type="hidden" name={name} value={String(checked)} />
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
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
    </div>
  );
}

function Checkbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-slate-300 text-cyan-700"
      />
      <span>{label}</span>
    </label>
  );
}

function InputLike({
  name,
  label,
  values,
  className = "",
  defaultValue = "",
  type = "text",
}: {
  name: string;
  label: string;
  values: PaymentValues;
  className?: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <FieldLabel help={`Informe ${label.toLowerCase()} para exibição no checkout.`}>
        {label}
      </FieldLabel>
      <input
        name={name}
        type={type}
        defaultValue={getStringValue(values[name], defaultValue)}
        className="h-11 rounded border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
      />
    </label>
  );
}

function upsertSetting(
  settings: StoredPaymentSetting[],
  nextSetting: StoredPaymentSetting,
) {
  const exists = settings.some((setting) => setting.featureId === nextSetting.featureId);

  if (!exists) {
    return [...settings, nextSetting];
  }

  return settings.map((setting) =>
    setting.featureId === nextSetting.featureId ? nextSetting : setting,
  );
}

function collectValues(formData: FormData) {
  const values: PaymentValues = {};

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

function getBooleanValue(value: string | string[] | undefined, fallback: boolean) {
  const stringValue = getStringValue(value);

  if (!stringValue) {
    return fallback;
  }

  return stringValue === "true";
}

function getArrayValue(value: string | string[] | undefined, fallback: string[]) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value) {
    return [value];
  }

  return fallback;
}
