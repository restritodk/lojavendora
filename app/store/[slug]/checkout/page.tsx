import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { requireCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import {
  getActiveStorePayments,
  getStoreAdvancedSettings,
} from "@/lib/store-advanced-settings";
import { CheckoutClient } from "./checkout-client";

export default async function StoreCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ product?: string; qty?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    include: {
      products: {
        where: {
          status: "ACTIVE",
          showOnSite: true,
        },
        orderBy: [{ showOnHome: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          imageUrl: true,
          categoryId: true,
          freightType: true,
          additionalFreight: true,
          stock: true,
          allowOutOfStock: true,
          minQuantity: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  if (!store) {
    notFound();
  }

  if (!store.active) {
    return <InactiveStorePage store={store} />;
  }
  const subscriptionCheck = await checkStoreSubscription(store.id);
  if (subscriptionCheck.isBlocked) {
    return <StoreTemporarilyUnavailable store={store} />;
  }

  const currentPath = buildCheckoutReturnPath(store.subdomain, query);
  const customer = await requireCustomer(
    store.id,
    `/store/${store.subdomain}/login?${new URLSearchParams({
      error: "Faça login ou crie seu cadastro para finalizar a compra.",
      returnTo: currentPath,
    }).toString()}`,
  );
  const customerProfile = await prisma.customer.findFirst({
    where: {
      id: customer.id,
      storeId: store.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      document: true,
      personType: true,
      zipCode: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
    },
  });

  if (!customerProfile) {
    notFound();
  }

  const advancedSettings = await getStoreAdvancedSettings(store.id);
  const fixedFreightSettings = await prisma.storeAdvancedSetting.findMany({
    where: {
      storeId: store.id,
      featureId: { contains: ":fixed-freight" },
    },
    select: {
      featureId: true,
      values: true,
    },
  });
  const activePayments = getActiveStorePayments(advancedSettings);
  const payments = expandCheckoutPayments([
    ...(advancedSettings["payment:customizado"]
      ? []
      : [
          {
            id: "customizado",
            values: {
              title: "Pagamento em mãos",
              checkoutDescription:
                "Finalize o pedido agora e combine o pagamento diretamente com a loja.",
              availableFor: ["Pessoa Física", "Pessoa Jurídica"],
            },
          },
        ]),
    ...activePayments,
  ]);
  const initialItems = buildInitialItems(query.product, query.qty, store.products);

  return (
    <CheckoutClient
      store={{
        name: store.name,
        subdomain: store.subdomain,
        logoUrl: store.logoUrl,
        primaryColor: store.primaryColor,
        accentColor: store.accentColor,
      }}
      products={store.products.map((product) => ({
        ...product,
        price: product.price.toString(),
        additionalFreight: product.additionalFreight?.toString() ?? null,
        fixedFreightRules: getFixedFreightRules(product.id, fixedFreightSettings),
      }))}
      payments={payments}
      initialItems={initialItems}
      customer={customerProfile}
    />
  );
}

function buildCheckoutReturnPath(
  slug: string,
  query: { product?: string; qty?: string },
) {
  const params = new URLSearchParams();

  if (query.product) {
    params.set("product", query.product);
  }

  if (query.qty) {
    params.set("qty", query.qty);
  }

  const queryString = params.toString();
  return `/store/${slug}/checkout${queryString ? `?${queryString}` : ""}`;
}

function buildInitialItems(
  productSlug: string | undefined,
  quantityValue: string | undefined,
  products: Array<{ id: string; slug: string; minQuantity: number }>,
) {
  const product = products.find((item) => item.slug === productSlug);

  if (!product) {
    return [];
  }

  const quantity = Number(quantityValue);

  return [
    {
      productId: product.id,
      quantity: Number.isInteger(quantity) && quantity > 0
        ? Math.max(product.minQuantity, quantity)
        : product.minQuantity,
    },
  ];
}

function getPaymentString(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function getPaymentArray(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function expandCheckoutPayments(
  payments: Array<{ id: string; values: Record<string, string | string[] | undefined> }>,
) {
  return payments.flatMap((payment) => {
    const enabledMethods = getPaymentArray(payment.values.enabledMethods);
    const basePayment = {
      id: payment.id,
      title: getPaymentString(payment.values.title, getPaymentTitle(payment.id)),
      description: getPaymentString(payment.values.checkoutDescription),
      additionalPercent: parseMoney(getPaymentString(payment.values.additionalPercent)),
      additionalValue: parseMoney(getPaymentString(payment.values.additionalValue)),
      pixKeyType: getPaymentString(payment.values.pixKeyType),
      pixKey: getPaymentString(payment.values.pixKey),
      beneficiaryName: getPaymentString(payment.values.beneficiaryName),
      bankName: getPaymentString(payment.values.bankName),
      agency: getPaymentString(payment.values.agency),
      account: getPaymentString(payment.values.account),
      merchantCity: getPaymentString(payment.values.merchantCity),
      gatewayId: getPaymentString(payment.values.gatewayId, payment.id),
      publicKey: getPaymentString(payment.values.publicKey),
      iconUrl: getPaymentIconUrl(payment.id),
      paymentKind: "manual",
      priority: Number(getPaymentString(payment.values.priority, "10")) || 10,
    };

    if (payment.id === "customizado" || payment.id === "pix-deposito") {
      return [basePayment];
    }

    const options = [];

    if (enabledMethods.includes("pix")) {
      options.push({
        ...basePayment,
        id: `${payment.id}:pix`,
        title: "Pix",
        iconUrl: getPaymentIconUrl(payment.id),
        paymentKind: "api-pix",
      });
    }

    if (enabledMethods.includes("credit") || enabledMethods.includes("debit")) {
      options.push({
        ...basePayment,
        id: `${payment.id}:card`,
        title: "Cartão Débito ou Crédito",
        iconUrl: getPaymentIconUrl(payment.id),
        paymentKind: "api-card",
      });
    }

    return options;
  }).sort((first, second) => first.priority - second.priority);
}

function getPaymentIconUrl(paymentId: string) {
  const icons: Record<string, string> = {
    customizado: "customizado.png",
    "pix-deposito": "deposito.png",
    "mercado-pago": "mercado_pago.png",
    "mercado-pago-transparente": "mercado_pago_api.png",
    pagseguro: "pagseguro.png",
    "pagseguro-transparente": "pagseguro_transparente.png",
    cielo: "cielo.png",
    "cielo-transparente": "cielo_integrado.png",
    rede: "rede.png",
    pagarme: "pagarme.png",
    picpay: "picpay.png",
    paghiper: "paghiper.png",
    paypal: "paypal_grande.png",
    f2b: "f2b.png",
    boletos: "boleto.png",
    wirecard: "wirecard.png",
  };

  return `/api/payment-icons/${icons[paymentId] ?? "customizado.png"}`;
}

function getFixedFreightRules(
  productId: string,
  settings: Array<{ featureId: string; values: unknown }>,
) {
  const setting = settings.find((item) => item.featureId === `product:${productId}:fixed-freight`);
  const values = setting?.values;
  const rules = values && typeof values === "object" && "rules" in values
    ? (values as { rules?: unknown }).rules
    : null;

  if (!Array.isArray(rules)) {
    return [];
  }

  return rules
    .map((rule) => {
      if (!rule || typeof rule !== "object") {
        return null;
      }

      const data = rule as Record<string, unknown>;
      return {
        state: String(data.state ?? ""),
        value: Number(data.value ?? 0),
        minDays: Number(data.minDays ?? 0),
        maxDays: Number(data.maxDays ?? 0),
      };
    })
    .filter((rule): rule is { state: string; value: number; minDays: number; maxDays: number } =>
      Boolean(rule?.state && Number.isFinite(rule.value) && rule.minDays > 0),
    );
}

function parseMoney(value: string) {
  if (!value) {
    return 0;
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPaymentTitle(paymentId: string) {
  const titles: Record<string, string> = {
    boletos: "Boletos Bancários / Webservices",
    cielo: "Cielo (Cartões)",
    "cielo-transparente": "Cielo Transparente 3.0",
    customizado: "Pagamento em mãos",
    f2b: "F2b",
    "mercado-pago": "Mercado Pago",
    "mercado-pago-transparente": "Mercado Pago Transparente",
    pagarme: "Pagar.me",
    paghiper: "Boleto PagHiper",
    pagseguro: "PagSeguro (UOL)",
    "pagseguro-transparente": "Cartão de Crédito Pagseguro (Transparente)",
    paypal: "PayPal Checkout",
    picpay: "PicPay",
    "pix-deposito": "PIX / Depósito Bancário",
    rede: "E-Rede",
    wirecard: "Wirecard",
  };

  return titles[paymentId] ?? paymentId;
}
