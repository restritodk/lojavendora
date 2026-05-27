"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo, useTransition } from "react";
import type { CheckoutResult } from "./actions";
import {
  checkGatewayPaymentStatusAction,
  createCardCheckoutOrderAction,
  createCheckoutOrderAction,
  submitPaymentProofAction,
} from "./actions";

type CheckoutProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  categoryId: string | null;
  freightType: string | null;
  additionalFreight: string | null;
  stock: number;
  allowOutOfStock: boolean;
  minQuantity: number;
  images: Array<{ url: string }>;
  fixedFreightRules: Array<{
    state: string;
    value: number;
    minDays: number;
    maxDays: number;
  }>;
};

type CheckoutPayment = {
  id: string;
  title: string;
  description: string;
  additionalPercent: number;
  additionalValue: number;
  pixKeyType: string;
  pixKey: string;
  beneficiaryName: string;
  bankName: string;
  agency: string;
  account: string;
  merchantCity: string;
  gatewayId: string;
  publicKey: string;
  iconUrl: string;
  paymentKind: string;
  priority: number;
};

type CheckoutStore = {
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

type CheckoutCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  personType: string;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type ShippingQuote = {
  state: string;
  city: string;
  fee: number;
  minDays: number;
  maxDays: number;
  message: string;
  type: "success" | "error" | "free";
};

type MercadoPagoSdk = {
  createCardToken: (data: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<{ id?: string }>;
  getPaymentMethods: (data: { bin: string }) => Promise<{
    results?: Array<{
      id?: string;
      payment_type_id?: string;
    }>;
  }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => MercadoPagoSdk;
  }
}

export function CheckoutClient({
  store,
  products,
  payments,
  initialItems,
  customer,
}: {
  store: CheckoutStore;
  products: CheckoutProduct[];
  payments: CheckoutPayment[];
  initialItems: CheckoutItem[];
  customer: CheckoutCustomer;
}) {
  const router = useRouter();
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const [items, setItems] = useState<CheckoutItem[]>(() =>
    normalizeInitialItems(initialItems, productMap),
  );
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [selectedPaymentId, setSelectedPaymentId] = useState(payments[0]?.id ?? "");
  const [couponCode, setCouponCode] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingZipCode, setShippingZipCode] = useState(customer.zipCode ?? "");
  const [isShippingLoading, setIsShippingLoading] = useState(false);
  const [feedback, setFeedback] = useState<CheckoutResult | null>(null);
  const [paymentProofOrder, setPaymentProofOrder] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    pixPayment?: CheckoutResult["pixPayment"];
  } | null>(null);
  const [gatewayOrder, setGatewayOrder] = useState<{
    orderNumber: string;
    total: number;
    paymentMethod: string;
    gatewayPayment: NonNullable<CheckoutResult["gatewayPayment"]>;
  } | null>(null);
  const [cardPaymentFormData, setCardPaymentFormData] = useState<FormData | null>(null);
  const [isPending, startTransition] = useTransition();
  const primaryColor = store.primaryColor ?? "#0f172a";
  const accentColor = store.accentColor ?? "#10b981";
  const storePath = `/store/${store.subdomain}`;
  const selectedPayment = payments.find((payment) => payment.id === selectedPaymentId);
  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + (product ? Number(product.price) * item.quantity : 0);
  }, 0);
  const paymentFee = selectedPayment
    ? subtotal * (selectedPayment.additionalPercent / 100) + selectedPayment.additionalValue
    : 0;
  const previewDiscount = calculatePreviewDiscount(subtotal, couponCode);
  const total = Math.max(subtotal + shippingFee + paymentFee - previewDiscount, 0);

  function addSelectedProduct() {
    if (!selectedProductId) return;
    const product = productMap.get(selectedProductId);

    if (!product) return;

    setItems((current) => {
      const existing = current.find((item) => item.productId === selectedProductId);

      if (existing) {
        return current.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + Math.max(product.minQuantity, 1) }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: selectedProductId,
          quantity: Math.max(product.minQuantity, 1),
        },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    const product = productMap.get(productId);
    const minQuantity = product?.minQuantity ?? 1;

    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(minQuantity, quantity || minQuantity) }
          : item,
      ),
    );
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  function submitCheckout(formData: FormData) {
    setFeedback(null);

    if (items.length > 0 && !shippingQuote) {
      setFeedback({
        type: "error",
        message: "Informe o CEP e calcule o frete antes de finalizar o pedido.",
      });
      return;
    }

    if (shippingQuote?.type === "error") {
      setFeedback({
        type: "error",
        message: shippingQuote.message,
      });
      return;
    }

    formData.set("items", JSON.stringify(items));
    formData.set("paymentMethod", selectedPaymentId);
    formData.set("couponCode", couponCode.trim());
    formData.set("shippingFee", shippingFee.toFixed(2));
    formData.set(
      "shippingMethod",
      shippingQuote
        ? `Frete ${shippingQuote.type === "free" ? "grátis" : "fixo"} - ${shippingQuote.minDays} a ${shippingQuote.maxDays} dias`
        : "Entrega padrão",
    );

    if (selectedPayment?.paymentKind === "api-card") {
      setCardPaymentFormData(formData);
      return;
    }

    startTransition(async () => {
      const result = await createCheckoutOrderAction(store.subdomain, formData);
      setFeedback(result);

      if (result.type === "success") {
        setItems([]);
        if (result.paymentMethod === "pix-deposito" && result.orderId && result.orderNumber) {
          setPaymentProofOrder({
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            total,
            pixPayment: result.pixPayment,
          });
        }
        if (result.gatewayPayment && result.orderNumber && result.paymentMethod) {
          setGatewayOrder({
            orderNumber: result.orderNumber,
            total,
            paymentMethod: result.paymentMethod,
            gatewayPayment: result.gatewayPayment,
          });
        }
      }
    });
  }

  function submitCardPayment(extraFormData: FormData) {
    if (!cardPaymentFormData) {
      return;
    }

    const finalFormData = new FormData();

    for (const [key, value] of cardPaymentFormData.entries()) {
      finalFormData.append(key, value);
    }

    for (const [key, value] of extraFormData.entries()) {
      finalFormData.set(key, value);
    }

    setCardPaymentFormData(null);
    startTransition(async () => {
      const result = await createCardCheckoutOrderAction(store.subdomain, finalFormData);
      setFeedback(result);

      if (result.type === "success") {
        setItems([]);
        if (result.gatewayPayment && result.orderNumber && result.paymentMethod) {
          setGatewayOrder({
            orderNumber: result.orderNumber,
            total,
            paymentMethod: result.paymentMethod,
            gatewayPayment: result.gatewayPayment,
          });
        }
      }
    });
  }

  async function calculateShipping() {
    setFeedback(null);
    setShippingQuote(null);
    setShippingFee(0);

    if (items.length === 0) {
      setShippingQuote({
        state: "",
        city: "",
        fee: 0,
        minDays: 0,
        maxDays: 0,
        message: "Adicione um produto para calcular o frete.",
        type: "error",
      });
      return;
    }

    const zipCode = shippingZipCode.replace(/\D/g, "");

    if (zipCode.length !== 8) {
      setShippingQuote({
        state: "",
        city: "",
        fee: 0,
        minDays: 0,
        maxDays: 0,
        message: "Informe um CEP válido com 8 dígitos.",
        type: "error",
      });
      return;
    }

    setIsShippingLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const address = await response.json() as { erro?: boolean; uf?: string; localidade?: string; logradouro?: string; bairro?: string };

      if (!response.ok || address.erro || !address.uf) {
        throw new Error("CEP não encontrado.");
      }

      const quote = buildShippingQuote(address.uf, address.localidade ?? "");

      setShippingQuote(quote);
      setShippingFee(quote.type === "success" ? quote.fee : 0);

      const streetInput = document.querySelector<HTMLInputElement>('input[name="street"]');
      const neighborhoodInput = document.querySelector<HTMLInputElement>('input[name="neighborhood"]');
      const cityInput = document.querySelector<HTMLInputElement>('input[name="city"]');
      const stateInput = document.querySelector<HTMLInputElement>('input[name="state"]');

      if (streetInput && address.logradouro) streetInput.value = address.logradouro;
      if (neighborhoodInput && address.bairro) neighborhoodInput.value = address.bairro;
      if (cityInput && address.localidade) cityInput.value = address.localidade;
      if (stateInput && address.uf) stateInput.value = address.uf;
    } catch {
      setShippingQuote({
        state: "",
        city: "",
        fee: 0,
        minDays: 0,
        maxDays: 0,
        message: "Não foi possível consultar o CEP informado.",
        type: "error",
      });
    } finally {
      setIsShippingLoading(false);
    }
  }

  function buildShippingQuote(state: string, city: string): ShippingQuote {
    const selectedItems = items
      .map((item) => ({ item, product: productMap.get(item.productId) }))
      .filter((entry): entry is { item: CheckoutItem; product: CheckoutProduct } => Boolean(entry.product));
    const hasOnlyFreeShipping = selectedItems.every(({ product }) => product.freightType === "gratis");

    if (hasOnlyFreeShipping) {
      return {
        state,
        city,
        fee: 0,
        minDays: 0,
        maxDays: 0,
        message: "Frete grátis para este pedido.",
        type: "free",
      };
    }

    let fee = 0;
    let minDays = 0;
    let maxDays = 0;

    for (const { product } of selectedItems) {
      if (product.freightType === "gratis") {
        continue;
      }

      if (product.freightType !== "fixo") {
        return {
          state,
          city,
          fee: 0,
          minDays: 0,
          maxDays: 0,
          message: "Frete não disponível para sua região.",
          type: "error",
        };
      }

      const rule = product.fixedFreightRules.find((item) => item.state === state);

      if (!rule) {
        return {
          state,
          city,
          fee: 0,
          minDays: 0,
          maxDays: 0,
          message: "Frete não disponível para sua região.",
          type: "error",
        };
      }

      fee += rule.value;
      minDays = minDays === 0 ? rule.minDays : Math.min(minDays, rule.minDays);
      maxDays = Math.max(maxDays, rule.maxDays);
    }

    return {
      state,
      city,
      fee,
      minDays,
      maxDays,
      message: `Entrega para ${city}/${state}: ${formatCurrency(fee)} em ${minDays} a ${maxDays} dias.`,
      type: "success",
    };
  }

  function submitPaymentProof(formData: FormData) {
    setFeedback(null);

    startTransition(async () => {
      const result = await submitPaymentProofAction(store.subdomain, formData);
      setFeedback(result);

      if (result.type === "success") {
        setPaymentProofOrder(null);
        router.push(`${storePath}/pedidos`);
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-white/10 text-white" style={{ background: primaryColor }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Link href={storePath} className="flex items-center gap-3">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={96}
                height={48}
                unoptimized
                className="max-h-12 w-auto rounded-xl object-contain"
              />
            ) : (
              <span
                className="grid size-12 place-items-center rounded-2xl text-lg font-black text-white"
                style={{ background: accentColor }}
              >
                {store.name.charAt(0)}
              </span>
            )}
            <span>
              <span className="block text-xl font-black">{store.name}</span>
              <span className="text-xs font-semibold text-white/60">Checkout seguro</span>
            </span>
          </Link>
          <Link href={storePath} className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
            Voltar para loja
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-8 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div
            className="grid gap-6 p-7 text-white lg:grid-cols-[1.3fr_0.7fr]"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/70">
                Finalização de compra
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
                Revise seu pedido e conclua a compra com segurança.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">
                Seus dados e os itens do pedido são vinculados somente à loja {store.name}.
                O lojista receberá o pedido no painel para confirmar pagamento e entrega.
              </p>
            </div>
            <div className="grid content-end gap-3 rounded-3xl bg-white/10 p-5">
              <span className="text-sm font-bold text-white/70">Total do pedido</span>
              <strong className="text-4xl font-black">{formatCurrency(total)}</strong>
              <span className="text-xs font-semibold text-white/70">
                {items.length} item(ns) no carrinho
              </span>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mb-6 rounded-3xl border p-5 text-sm font-bold ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.message}
            {feedback.orderNumber ? (
              <Link
                href={`${storePath}/pedidos`}
                className="ml-3 underline decoration-2 underline-offset-4"
              >
                Acompanhar pedidos
              </Link>
            ) : null}
          </div>
        ) : null}

        <form action={submitCheckout} className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="grid gap-6">
            <CheckoutSection step="1" title="Produtos do pedido">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row">
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-slate-400"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(Number(product.price))}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addSelectedProduct}
                  className="rounded-xl px-5 py-3 text-sm font-black text-white"
                  style={{ background: primaryColor }}
                >
                  Adicionar
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
                    Seu carrinho está vazio. Adicione um produto para continuar.
                  </div>
                ) : (
                  items.map((item) => {
                    const product = productMap.get(item.productId);

                    if (!product) return null;

                    const image = product.images[0]?.url ?? product.imageUrl;

                    return (
                      <div
                        key={item.productId}
                        className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[72px_1fr_auto]"
                      >
                        <div className="grid size-18 place-items-center rounded-2xl bg-slate-50">
                          <Image
                            src={image ?? `https://picsum.photos/seed/${product.slug}/160/160`}
                            alt={product.name}
                            width={72}
                            height={72}
                            unoptimized
                            className="size-16 object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-black">{product.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatCurrency(Number(product.price))} por unidade
                          </p>
                          {!product.allowOutOfStock ? (
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              Estoque: {product.stock}
                            </p>
                          ) : null}
                          {product.freightType === "gratis" ? (
                            <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              Frete grátis para este produto
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                          <input
                            type="number"
                            min={product.minQuantity}
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(item.productId, Number(event.target.value))
                            }
                            className="h-11 w-20 rounded-xl border border-slate-200 text-center text-sm font-black outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CheckoutSection>

            <CheckoutSection step="2" title="Comprador logado">
              <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-3">
                <ProfileItem label="Nome" value={customer.name} />
                <ProfileItem label="E-mail" value={customer.email ?? "Não informado"} />
                <ProfileItem label="Telefone" value={customer.phone ?? "Não informado"} />
                <ProfileItem
                  label="Tipo"
                  value={customer.personType === "JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física"}
                />
                <ProfileItem label="Documento" value={customer.document ?? "Não informado"} />
                <Link
                  href={`${storePath}/login?returnTo=${encodeURIComponent(`/store/${store.subdomain}/checkout`)}`}
                  className="self-end rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-black text-emerald-700"
                >
                  Trocar conta
                </Link>
              </div>
            </CheckoutSection>

            <CheckoutSection step="3" title="Entrega">
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    name="shippingZipCodePreview"
                    label="Digite seu CEP para calcular o frete"
                    value={shippingZipCode}
                    onChange={(event) => setShippingZipCode(event.target.value)}
                    placeholder="00000-000"
                  />
                  <button
                    type="button"
                    onClick={calculateShipping}
                    disabled={isShippingLoading}
                    className="self-end rounded-xl bg-[#17293f] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isShippingLoading ? "Calculando..." : "Calcular frete"}
                  </button>
                </div>
                {shippingQuote ? (
                  <div
                    className={`mt-3 rounded-xl p-3 text-sm font-bold ${
                      shippingQuote.type === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {shippingQuote.message}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Input name="zipCode" label="CEP" value={shippingZipCode} onChange={(event) => setShippingZipCode(event.target.value)} required />
                <Input
                  name="street"
                  label="Rua / Avenida"
                  defaultValue={customer.street ?? ""}
                  className="md:col-span-2"
                  required
                />
                <Input name="number" label="Número" defaultValue={customer.number ?? ""} required />
                <Input name="complement" label="Complemento" defaultValue={customer.complement ?? ""} />
                <Input
                  name="neighborhood"
                  label="Bairro"
                  defaultValue={customer.neighborhood ?? ""}
                  required
                />
                <Input name="city" label="Cidade" defaultValue={customer.city ?? ""} required />
                <Input name="state" label="Estado" defaultValue={customer.state ?? ""} required />
              </div>
              <label className="mt-4 grid gap-2">
                <span className="text-sm font-black text-slate-700">Observações do pedido</span>
                <textarea
                  name="notes"
                  className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                  placeholder="Ex: entregar no período da tarde."
                />
              </label>
            </CheckoutSection>

            <CheckoutSection step="4" title="Pagamento">
              {payments.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
                  Esta loja ainda não configurou formas de pagamento ativas.
                </div>
              ) : (
                <div className="grid gap-2">
                  {payments.map((payment) => (
                    <PaymentOptionRow
                      key={payment.id}
                      payment={payment}
                      selected={selectedPaymentId === payment.id}
                      onSelect={() => setSelectedPaymentId(payment.id)}
                    />
                  ))}
                  <p className="mt-2 text-center text-xs font-semibold text-slate-400">
                    Suas informações estão protegidas com criptografia SSL.
                  </p>
                </div>
              )}
            </CheckoutSection>
          </div>

          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-xl font-black">Resumo do pedido</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryLine label="Entrega" value={formatCurrency(shippingFee)} />
              <SummaryLine label="Taxa da forma de pagamento" value={formatCurrency(paymentFee)} />
              <label className="grid gap-2 rounded-2xl border border-dashed border-slate-200 p-3">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Cupom de desconto</span>
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Digite seu cupom"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold uppercase outline-none focus:border-cyan-500"
                />
                {previewDiscount > 0 ? (
                  <span className="text-xs font-bold text-emerald-700">
                    O desconto será validado novamente ao finalizar.
                  </span>
                ) : null}
              </label>
              {previewDiscount > 0 ? (
                <SummaryLine label="Desconto estimado" value={`-${formatCurrency(previewDiscount)}`} />
              ) : null}
              <div className="my-2 h-px bg-slate-200" />
              <SummaryLine label="Total" value={formatCurrency(total)} strong />
            </div>
            <button
              type="submit"
              disabled={isPending || items.length === 0 || payments.length === 0}
              className="mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black uppercase text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
              style={{ background: items.length === 0 || payments.length === 0 ? undefined : accentColor }}
            >
              {isPending ? "Finalizando..." : "Finalizar pedido"}
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Ao finalizar, seu pedido será enviado para o painel do lojista desta loja.
            </p>
          </aside>
        </form>
      </section>
      {paymentProofOrder ? (
        <PaymentProofModal
          order={paymentProofOrder}
          isPending={isPending}
          onClose={() => router.push(`${storePath}/pedidos`)}
          onSubmit={submitPaymentProof}
        />
      ) : null}
      {gatewayOrder ? (
        <GatewayPaymentModal
          order={gatewayOrder}
          storeSlug={store.subdomain}
          onClose={() => {
            setGatewayOrder(null);
            router.push(`${storePath}/pedidos`);
          }}
          onApproved={() => {
            setGatewayOrder(null);
            router.push(`${storePath}/pedidos`);
          }}
        />
      ) : null}
      {cardPaymentFormData && selectedPayment ? (
        <CardPaymentModal
          payment={selectedPayment}
          customer={customer}
          total={total}
          isPending={isPending}
          onClose={() => setCardPaymentFormData(null)}
          onSubmit={submitCardPayment}
        />
      ) : null}
    </main>
  );
}

function CardPaymentModal({
  payment,
  customer,
  total,
  isPending,
  onClose,
  onSubmit,
}: {
  payment: CheckoutPayment;
  customer: CheckoutCustomer;
  total: number;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState(customer.name);
  const [payerDocument, setPayerDocument] = useState(maskDocument(customer.document ?? ""));
  const [expiration, setExpiration] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [cardPaymentType, setCardPaymentType] = useState<"credit_card" | "debit_card">("credit_card");
  const [isCvvFocused, setIsCvvFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function submitCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsTokenizing(true);

    if (!payment.publicKey) {
      setFeedback("Chave pública do Mercado Pago não configurada.");
      setIsTokenizing(false);
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\D/g, "");
    const cleanExpiration = expiration.replace(/\D/g, "");
    const cleanSecurityCode = securityCode.replace(/\D/g, "");
    const cleanDocument = payerDocument.replace(/\D/g, "");
    const mp = getMercadoPagoSdk(payment.publicKey);

    if (!validateCardFields({
      cardNumber: cleanCardNumber,
      expiration: cleanExpiration,
      securityCode: cleanSecurityCode,
      cardholderName,
      payerDocument: cleanDocument,
    })) {
      setFeedback("Preencha todos os dados do cartão corretamente.");
      setIsTokenizing(false);
      return;
    }

    if (!mp) {
      setFeedback("SDK do Mercado Pago ainda está carregando. Tente novamente.");
      setIsTokenizing(false);
      return;
    }

    try {
      const token = await mp.createCardToken({
        cardNumber: cleanCardNumber,
        cardholderName,
        cardExpirationMonth: cleanExpiration.slice(0, 2),
        cardExpirationYear: `20${cleanExpiration.slice(2, 4)}`,
        securityCode: cleanSecurityCode,
        identificationType: cleanDocument.length === 14 ? "CNPJ" : "CPF",
        identificationNumber: cleanDocument,
      });
      const tokenId = token?.id;
      const paymentMethods = await mp.getPaymentMethods({ bin: cleanCardNumber.slice(0, 6) });
      const selectedPaymentMethod = paymentMethods.results?.find(
        (method) => method.payment_type_id === cardPaymentType,
      ) ?? paymentMethods.results?.[0];
      const paymentMethodId = selectedPaymentMethod?.id;

      if (!tokenId || !paymentMethodId) {
        throw new Error(
          cardPaymentType === "debit_card"
            ? "Este cartão não retornou opção de débito no Mercado Pago."
            : "Token ou bandeira do cartão não gerado.",
        );
      }

      const secureFormData = new FormData();
      secureFormData.set("cardToken", tokenId);
      secureFormData.set("installments", "1");
      secureFormData.set("payerDocument", cleanDocument);
      secureFormData.set("cardholderName", cardholderName);
      secureFormData.set("paymentMethodId", paymentMethodId);
      secureFormData.set("cardPaymentType", cardPaymentType);
      onSubmit(secureFormData);
    } catch (error) {
      setFeedback(getCardTokenizationError(error, cardPaymentType));
    } finally {
      setIsTokenizing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm">
      <form
        ref={formRef}
        onSubmit={submitCard}
        autoComplete="off"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
              Pagamento seguro
            </p>
            <h2 className="mt-1 text-2xl font-black">Cartão Débito ou Crédito</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl font-black">×</button>
        </header>
        <div className="grid gap-5 p-6">
          <CreditCardPreview
            cardNumber={cardNumber}
            cardholderName={cardholderName}
            expiration={expiration}
            securityCode={securityCode}
            flipped={isCvvFocused}
          />
          <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            Valor: {formatCurrency(total)}. Os dados do cartão são tokenizados pelo Mercado Pago.
          </div>
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
              <CardTypeButton
                label="Cartão de crédito"
                selected={cardPaymentType === "credit_card"}
                onClick={() => setCardPaymentType("credit_card")}
              />
              <CardTypeButton
                label="Cartão de débito"
                selected={cardPaymentType === "debit_card"}
                onClick={() => setCardPaymentType("debit_card")}
              />
            </div>
            <ModernInput
              label="Nome impresso no cartão"
              value={cardholderName}
              onChange={setCardholderName}
            />
            <ModernInput
              label="CPF/CNPJ do pagador"
              value={payerDocument}
              onChange={(value) => setPayerDocument(maskDocument(value))}
              autoComplete="off"
            />
            <ModernInput
              label="Número do cartão"
              value={cardNumber}
              onChange={(value) => setCardNumber(maskCardNumber(value))}
              placeholder="0000 0000 0000 0000"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ModernInput
                label="Validade"
                value={expiration}
                onChange={(value) => setExpiration(maskExpiration(value))}
                placeholder="MM/AA"
              />
              <ModernInput
                label="CVV"
                value={securityCode}
                onChange={(value) => setSecurityCode(value.replace(/\D/g, "").slice(0, 3))}
                placeholder="123"
                onFocus={() => setIsCvvFocused(true)}
                onBlur={() => setIsCvvFocused(false)}
              />
            </div>
          </div>
          {feedback ? (
            <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{feedback}</div>
          ) : null}
        </div>
        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600">
            Cancelar
          </button>
          <button disabled={isPending || isTokenizing} className="rounded-full bg-[#009ee3] px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 disabled:opacity-60">
            {isPending || isTokenizing ? "Processando..." : "Pagar agora"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function CreditCardPreview({
  cardNumber,
  cardholderName,
  expiration,
  securityCode,
  flipped,
}: {
  cardNumber: string;
  cardholderName: string;
  expiration: string;
  securityCode: string;
  flipped: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-md [perspective:1200px]">
      <div
        className={`relative h-56 rounded-[1.5rem] transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-slate-800 to-sky-700 p-6 text-white shadow-2xl [backface-visibility:hidden]">
          <div className="absolute -right-16 -top-16 size-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 left-8 size-48 rounded-full bg-sky-300/20" />
          <div className="relative flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Vendora Pay</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">MP</span>
          </div>
          <div className="relative mt-10 text-2xl font-black tracking-[0.16em]">
            {maskCardPreview(cardNumber)}
          </div>
          <div className="relative mt-8 grid grid-cols-[1fr_auto] gap-4 text-xs uppercase tracking-[0.14em] text-white/70">
            <span>
              Titular
              <strong className="mt-1 block truncate text-sm text-white">
                {cardholderName || "NOME DO TITULAR"}
              </strong>
            </span>
            <span>
              Validade
              <strong className="mt-1 block text-sm text-white">{expiration || "MM/AA"}</strong>
            </span>
          </div>
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mt-5 h-12 bg-black/50" />
          <div className="mt-8 rounded-xl bg-white p-4 text-right text-slate-950">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">CVV</span>
            <strong className="ml-4 text-lg">{securityCode ? "***" : "***"}</strong>
          </div>
          <p className="mt-5 text-xs font-semibold leading-5 text-white/60">
            Código de segurança usado apenas para tokenização no Mercado Pago.
          </p>
        </div>
      </div>
    </div>
  );
}

function ModernInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  onFocus,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-lpignore="true"
        data-form-type="other"
        className="h-13 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function CardTypeButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
        selected
          ? "border-sky-400 bg-white text-sky-700 shadow-sm"
          : "border-transparent bg-transparent text-slate-500 hover:bg-white"
      }`}
    >
      <span className={`grid size-5 place-items-center rounded-full border ${
        selected ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
      }`}>
        <span className={`size-2 rounded-full bg-white ${selected ? "scale-100" : "scale-0"}`} />
      </span>
      {label}
    </button>
  );
}

function GatewayPaymentModal({
  order,
  storeSlug,
  onClose,
  onApproved,
}: {
  order: {
    orderNumber: string;
    total: number;
    paymentMethod: string;
    gatewayPayment: NonNullable<CheckoutResult["gatewayPayment"]>;
  };
  storeSlug: string;
  onClose: () => void;
  onApproved: () => void;
}) {
  const isPix = order.paymentMethod.endsWith(":pix");
  const qrCodeSrc = order.gatewayPayment.pixQrCodeBase64
    ? `data:image/png;base64,${order.gatewayPayment.pixQrCodeBase64}`
    : "";
  const [statusMessage, setStatusMessage] = useState(
    isPix ? "Aguardando pagamento no banco..." : order.gatewayPayment.message,
  );
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!isPix || approved) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      void checkGatewayPaymentStatusAction(storeSlug, order.orderNumber).then((result) => {
        if (cancelled) {
          return;
        }

        setStatusMessage(result.message);

        if (result.type === "approved") {
          setApproved(true);
          window.clearInterval(interval);
          window.setTimeout(onApproved, 1400);
        }
      });
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [approved, isPix, onApproved, order.orderNumber, storeSlug]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
              Mercado Pago
            </p>
            <h2 className="mt-1 text-xl font-black">Pedido {order.orderNumber}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl font-black">×</button>
        </header>
        <div className="grid gap-4 p-5 text-center">
          <div className="rounded-full bg-sky-50 px-5 py-2 text-sm font-black text-sky-700">
            Valor da compra: {formatCurrency(order.total)}
          </div>
          {isPix ? (
            <>
              {approved ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  Pagamento confirmado! Redirecionando para Meus pedidos...
                </div>
              ) : null}
              {qrCodeSrc ? (
                <Image
                  src={qrCodeSrc}
                  alt="QR Code PIX Mercado Pago"
                  width={240}
                  height={240}
                  unoptimized
                  className="mx-auto rounded-2xl border border-slate-100 object-contain shadow-sm"
                />
              ) : null}
              <strong className="text-sm text-slate-900">
                Escaneie o QR Code no app do banco. A confirmação será automática pelo Mercado Pago.
              </strong>
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                {statusMessage}
              </p>
              {order.gatewayPayment.pixQrCode ? (
                <details className="rounded-2xl bg-slate-50 p-3 text-left">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Ver PIX copia e cola
                  </summary>
                  <code className="mt-3 block max-h-28 overflow-auto rounded-xl bg-white p-3 text-[11px] leading-4 text-slate-700">
                    {order.gatewayPayment.pixQrCode}
                  </code>
                </details>
              ) : null}
            </>
          ) : (
            <>
              {order.gatewayPayment.checkoutUrl ? (
                <>
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                    Para concluir o pagamento com cartão, continue no ambiente seguro do Mercado Pago.
                  </p>
                <a
                  href={order.gatewayPayment.checkoutUrl}
                  className="rounded-2xl bg-[#009ee3] px-5 py-4 text-sm font-black uppercase text-white shadow-lg"
                >
                  Pagar com cartão
                </a>
                </>
              ) : (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  Pagamento enviado ao Mercado Pago. Aguarde a confirmação.
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600"
          >
            Acompanhar pedido
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentOptionRow({
  payment,
  selected,
  onSelect,
}: {
  payment: CheckoutPayment;
  selected: boolean;
  onSelect: () => void;
}) {
  const description = getPaymentDescription(payment);

  return (
    <label
      className={`group cursor-pointer rounded-2xl border px-4 py-3 transition-all duration-200 ${
        selected
          ? "border-emerald-300 bg-emerald-50/70 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <input
        type="radio"
        name="paymentChoice"
        value={payment.id}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-center gap-3">
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${
            selected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
          }`}
        >
          <span className={`size-2 rounded-full bg-white transition ${selected ? "scale-100" : "scale-0"}`} />
        </span>
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-xl transition ${
            selected ? "bg-white text-emerald-700 shadow-sm" : "bg-slate-50 text-slate-500"
          }`}
        >
          {getPaymentIcon(payment)}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-black text-slate-950">{payment.title}</strong>
          <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
            {description}
          </span>
        </span>
        <span
          className={`text-sm font-black transition-transform duration-200 ${
            selected ? "rotate-180 text-emerald-600" : "text-slate-400"
          }`}
        >
          ˅
        </span>
      </span>
      <span
        className={`grid overflow-hidden transition-all duration-300 ${
          selected ? "mt-3 max-h-72 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {payment.id === "pix-deposito" ? (
          <PixDepositDetails payment={payment} compact />
        ) : payment.paymentKind === "api-pix" || payment.paymentKind === "api-card" ? (
          <span className="rounded-xl bg-sky-50 px-4 py-3 text-xs font-semibold leading-5 text-sky-800">
            A confirmação do pagamento ocorre automaticamente pelo retorno oficial do Mercado Pago.
          </span>
        ) : (
          <span className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
            O pagamento será combinado diretamente com a loja após a finalização do pedido.
          </span>
        )}
      </span>
    </label>
  );
}

function getPaymentDescription(payment: CheckoutPayment) {
  if (payment.paymentKind === "api-pix") {
    return `QR Code Pix gerado pelo ${getGatewayLabel(payment.gatewayId)}.`;
  }

  if (payment.paymentKind === "api-card") {
    return "Pague com cartão em ambiente seguro.";
  }

  return payment.description || "Finalize e combine os detalhes com a loja.";
}

function getGatewayLabel(gatewayId: string) {
  const labels: Record<string, string> = {
    "mercado-pago": "Mercado Pago",
    "mercado-pago-transparente": "Mercado Pago",
    pagseguro: "PagSeguro/PagBank",
    "pagseguro-transparente": "PagSeguro/PagBank",
    cielo: "Cielo",
    "cielo-transparente": "Cielo",
    rede: "Rede",
    pagarme: "Pagar.me",
    picpay: "PicPay",
    paghiper: "PagHiper",
    paypal: "PayPal",
    f2b: "F2B",
    boletos: "Boletos",
    wirecard: "Wirecard",
  };

  return labels[gatewayId] ?? "gateway configurado";
}

function getPaymentIcon(payment: CheckoutPayment) {
  if (payment.iconUrl) {
    return (
      <Image
        src={payment.iconUrl}
        alt={payment.title}
        width={42}
        height={30}
        unoptimized
        className="max-h-8 w-auto object-contain"
      />
    );
  }

  return "◇";
}

function PixDepositDetails({
  payment,
  compact = false,
}: {
  payment: CheckoutPayment;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "rounded-xl bg-white/70 p-3 text-xs" : "mt-4 rounded-2xl border border-emerald-100 bg-white p-4 text-sm"} text-slate-600`}>
      <div className={`grid gap-4 ${compact ? "" : "md:grid-cols-[140px_1fr]"}`}>
        <div className={`${compact ? "hidden" : "grid"} size-36 place-items-center rounded-xl bg-emerald-50 text-center text-lg font-black text-emerald-600`}>
          QR PIX
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-500">
            gerado no pedido
          </span>
        </div>
        <div className="grid gap-1">
          <strong className="text-slate-900">Dados para pagamento</strong>
          {payment.beneficiaryName ? <span>Beneficiário: {payment.beneficiaryName}</span> : null}
          {payment.pixKey ? <span>{payment.pixKeyType || "Chave PIX"}: {payment.pixKey}</span> : null}
          {payment.bankName ? <span>Banco: {payment.bankName}</span> : null}
          {payment.agency ? <span>Agência: {payment.agency}</span> : null}
          {payment.account ? <span>Conta: {payment.account}</span> : null}
          {payment.merchantCity ? <span>Cidade: {payment.merchantCity}</span> : null}
          <span className="mt-2 rounded-lg bg-slate-100 p-3 text-xs font-semibold text-slate-700">
            O código PIX copia e cola e o QR Code serão exibidos após finalizar o pedido.
          </span>
        </div>
      </div>
    </div>
  );
}

function PaymentProofModal({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: {
    orderId: string;
    orderNumber: string;
    total: number;
    pixPayment?: CheckoutResult["pixPayment"];
  };
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  function requestConfirmation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowConfirmDialog(true);
  }

  function confirmPaymentProof() {
    if (!formRef.current) return;
    setShowConfirmDialog(false);
    onSubmit(new FormData(formRef.current));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <form
        ref={formRef}
        onSubmit={requestConfirmation}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl"
      >
        <input type="hidden" name="orderId" value={order.orderId} />
        <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Confirmação de pagamento
            </p>
            <h2 className="mt-1 text-xl font-black">Pedido {order.orderNumber}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl font-black">×</button>
        </header>
        <div className="grid gap-3 p-5">
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
            Após realizar o PIX ou depósito, envie os dados abaixo para a loja validar o pagamento.
          </p>
          {order.pixPayment ? (
            <div className="grid justify-items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-center">
              <div className="rounded-full bg-emerald-50 px-5 py-2 text-sm font-black text-emerald-700">
                Valor da compra: {formatCurrency(order.total)}
              </div>
              <Image
                src={order.pixPayment.qrCodeDataUrl}
                alt="QR Code PIX gerado automaticamente"
                width={220}
                height={220}
                unoptimized
                className="rounded-2xl border border-slate-100 object-contain shadow-sm"
              />
              <strong className="text-sm text-slate-900">
                Escaneie o QR Code no app do seu banco para pagar este pedido.
              </strong>
              <details className="w-full rounded-2xl bg-slate-50 p-3 text-left">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Ver PIX copia e cola
                </summary>
                <code className="mt-3 block max-h-28 overflow-auto rounded-xl bg-white p-3 text-[11px] leading-4 text-slate-700">
                  {order.pixPayment.copiaECola}
                </code>
              </details>
            </div>
          ) : null}
          <Input name="payerName" label="Nome de quem fez o pagamento" required />
          <Input name="payerDocument" label="CPF/CNPJ de quem pagou" required />
          <label className="grid gap-3">
            <span className="text-sm font-black text-slate-700">Comprovante de pagamento</span>
            <span className="grid cursor-pointer justify-items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50">
              <span className="grid size-11 place-items-center rounded-full bg-white text-xl shadow-sm">↑</span>
              <span className="text-sm font-black text-slate-800">Anexar comprovante</span>
              <span className="text-xs font-semibold text-slate-500">
                Envie uma imagem ou PDF do pagamento para a loja validar.
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600 shadow-sm">
                PNG, JPG ou PDF
              </span>
            </span>
            <input
              name="receiptFile"
              type="file"
              accept="image/*,.pdf"
              required
              onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {receiptFile ? (
              <span className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <span className="truncate">{receiptFile.name}</span>
                <span className="shrink-0 text-xs text-emerald-600">
                  {formatFileSize(receiptFile.size)}
                </span>
              </span>
            ) : null}
          </label>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600">
            Enviar depois
          </button>
          <button disabled={isPending} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
            {isPending ? "Enviando..." : "Confirmar pagamento"}
          </button>
        </footer>
      </form>
      {showConfirmDialog ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
              ✓
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-950">Confirmar envio do comprovante?</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Confirme apenas se você já realizou o PIX no valor de {formatCurrency(order.total)} e anexou o comprovante correto.
            </p>
            {receiptFile ? (
              <p className="mt-4 truncate rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                {receiptFile.name}
              </p>
            ) : null}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={confirmPaymentProof}
                disabled={isPending}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300"
              >
                Sim, enviar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckoutSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
          {step}
        </span>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Input({
  name,
  label,
  type = "text",
  required,
  className = "",
  defaultValue = "",
  value,
  onChange,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
}) {
  const valueProps = value !== undefined ? { value, onChange } : { defaultValue };

  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        {...valueProps}
        className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700/70">
        {label}
      </span>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-lg font-black" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-slate-900">{value}</span>
    </div>
  );
}

function normalizeInitialItems(
  initialItems: CheckoutItem[],
  productMap: Map<string, CheckoutProduct>,
) {
  return initialItems
    .map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        return null;
      }

      return {
        productId: item.productId,
        quantity: Math.max(product.minQuantity, item.quantity || product.minQuantity),
      };
    })
    .filter((item): item is CheckoutItem => Boolean(item));
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calculatePreviewDiscount(subtotal: number, couponCode: string) {
  void subtotal;
  void couponCode;
  return 0;
}

function getMercadoPagoSdk(publicKey: string) {
  if (!window.MercadoPago) {
    return null;
  }

  return new window.MercadoPago(publicKey);
}

function getCardTokenizationError(error: unknown, cardPaymentType: "credit_card" | "debit_card") {
  const fallback = cardPaymentType === "debit_card"
    ? "Não foi possível validar este cartão como débito no Mercado Pago."
    : "Não foi possível validar este cartão como crédito no Mercado Pago.";

  if (error instanceof Error && error.message) {
    return `${fallback} ${error.message}`;
  }

  if (error && typeof error === "object") {
    const data = error as {
      message?: unknown;
      error?: unknown;
      cause?: Array<{ description?: unknown; code?: unknown }>;
    };
    const cause = Array.isArray(data.cause)
      ? data.cause
          .map((item) => typeof item.description === "string" ? item.description : String(item.code ?? ""))
          .filter(Boolean)
          .join(" ")
      : "";
    const message = [data.message, data.error, cause]
      .filter((item): item is string => typeof item === "string" && item.length > 0)
      .join(" ");

    if (message) {
      return `${fallback} ${message}`;
    }
  }

  return `${fallback} Confira se o cartão é um cartão de teste oficial do Mercado Pago e tente novamente.`;
}

function maskCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function maskCardPreview(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "0000 **** **** 0000";
  }

  const first = digits.slice(0, 4).padEnd(4, "0");
  const last = digits.length >= 8 ? digits.slice(-4).padStart(4, "*") : "****";

  return `${first} **** **** ${last}`;
}

function maskExpiration(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskDocument(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function validateCardFields({
  cardNumber,
  expiration,
  securityCode,
  cardholderName,
  payerDocument,
}: {
  cardNumber: string;
  expiration: string;
  securityCode: string;
  cardholderName: string;
  payerDocument: string;
}) {
  const month = Number(expiration.slice(0, 2));

  return (
    cardNumber.length >= 13 &&
    expiration.length === 4 &&
    month >= 1 &&
    month <= 12 &&
    securityCode.length >= 3 &&
    cardholderName.trim().length >= 3 &&
    (payerDocument.length === 11 || payerDocument.length === 14)
  );
}

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(value / 1024, 1).toFixed(0)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
