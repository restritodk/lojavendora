import "server-only";
import { prisma } from "@/lib/prisma";
import {
  syncLogisticsIntegration,
  syncMarketingIntegration,
  syncSecurityIntegration,
  syncServiceIntegration,
} from "./domain-services";
import {
  createIntegrationLog,
  getStoreIntegrationContext,
  type StoreIntegrationContext,
} from "./settings";

type TestConnectionResult = {
  success: boolean;
  message: string;
};

export async function testStoreIntegrationConnection(storeId: string, appId: string) {
  const context = await getStoreIntegrationContext(storeId, appId);

  if (!context?.active) {
    return logAndReturn(storeId, appId, "test-connection", false, "Aplicativo desativado nesta loja.");
  }

  const validator = connectionValidators[appId] ?? validateGenericConnection;
  const result = validator(context);

  await createIntegrationLog({
    storeId,
    appId,
    action: "test-connection",
    status: result.success ? "success" : "error",
    message: result.message,
  });

  return result;
}

export async function syncStoreIntegration(storeId: string, appId: string) {
  const context = await getStoreIntegrationContext(storeId, appId);

  if (!context?.active) {
    return logAndReturn(storeId, appId, "sync", false, "Aplicativo desativado nesta loja.");
  }

  const syncer = integrationSyncers[appId] ?? syncGenericIntegration;
  const result = await syncer(context);
  const domainSyncer = domainSyncers[appId];

  if (domainSyncer) {
    await domainSyncer(storeId, appId);
  }

  await createIntegrationLog({
    storeId,
    appId,
    action: "sync",
    status: result.success ? "success" : "error",
    message: result.message,
  });

  return result;
}

const connectionValidators: Record<string, (context: StoreIntegrationContext) => TestConnectionResult> = {
  "google-analytics": (context) => requireValue(context, "measurementId", /^G-[A-Z0-9-]+$/i, "ID de medição inválido."),
  "google-tag-manager": (context) => requireValue(context, "containerId", /^GTM-[A-Z0-9-]+$/i, "Container GTM inválido."),
  "facebook-instagram": (context) => requireValue(context, "pixelId", /^\d+$/, "Pixel ID inválido."),
  "yandex-metrica": (context) => requireValue(context, "counterId", /^\d+$/, "Counter ID inválido."),
  whatsapp: (context) => requireValue(context, "phone", /\d{10,13}/, "Número de WhatsApp inválido."),
  mailchimp: (context) => requireSecret(context, "apiKey", "API Key do MailChimp não informada."),
  "rd-station": (context) => requireSecret(context, "clientSecret", "Client Secret do RD Station não informado."),
  "melhor-envio": (context) => requireSecret(context, "token", "Token do Melhor Envio não informado."),
  kangu: (context) => requireSecret(context, "token", "Token Kangu não informado."),
  bling: (context) => requireSecret(context, "clientSecret", "Client Secret do Bling não informado."),
  "clearsale-total": (context) => requireSecret(context, "appSecret", "App Secret da ClearSale não informado."),
  konduto: (context) => requireSecret(context, "privateKey", "Private Key Konduto não informada."),
};

const integrationSyncers: Record<string, (context: StoreIntegrationContext) => Promise<TestConnectionResult>> = {
  "google-shopping": syncProductFeed,
  "facebook-xml": syncProductFeed,
  "mercado-livre": syncProductFeed,
  bling: syncProductsAndOrders,
  mailchimp: syncCustomers,
  "rd-station": syncCustomers,
  "melhor-envio": syncOpenOrders,
  kangu: syncOpenOrders,
  "sigep-correios": syncOpenOrders,
  nfe: syncFiscalOrders,
  "clearsale-start": syncSecurityOrders,
  "clearsale-total": syncSecurityOrders,
  "clearsale-auth": syncSecurityOrders,
  konduto: syncSecurityOrders,
};

const domainSyncers: Record<string, (storeId: string, appId: string) => Promise<void>> = {
  "google-shopping": syncMarketingIntegration,
  "facebook-xml": syncMarketingIntegration,
  "mercado-livre": syncMarketingIntegration,
  mailchimp: syncMarketingIntegration,
  "rd-station": syncMarketingIntegration,
  "facebook-instagram": syncMarketingIntegration,
  "shop-back": syncMarketingIntegration,
  enviou: syncMarketingIntegration,
  jivochat: syncServiceIntegration,
  disqus: syncServiceIntegration,
  "facebook-comments": syncServiceIntegration,
  yourviews: syncServiceIntegration,
  trustvox: syncServiceIntegration,
  trusted: syncServiceIntegration,
  zendesk: syncServiceIntegration,
  "melhor-envio": syncLogisticsIntegration,
  kangu: syncLogisticsIntegration,
  "sigep-correios": syncLogisticsIntegration,
  bling: syncLogisticsIntegration,
  nfe: syncLogisticsIntegration,
  "clearsale-start": syncSecurityIntegration,
  "clearsale-total": syncSecurityIntegration,
  "clearsale-auth": syncSecurityIntegration,
  konduto: syncSecurityIntegration,
};

function validateGenericConnection(context: StoreIntegrationContext): TestConnectionResult {
  const hasValues = Object.values(context.values).some(Boolean) || Object.values(context.secrets).some(Boolean);

  return {
    success: hasValues,
    message: hasValues
      ? "Configuração encontrada para esta loja."
      : "Preencha pelo menos uma credencial ou identificador do aplicativo.",
  };
}

function requireValue(
  context: StoreIntegrationContext,
  key: string,
  pattern: RegExp,
  errorMessage: string,
): TestConnectionResult {
  const value = String(context.values[key] ?? "");

  return {
    success: pattern.test(value),
    message: pattern.test(value) ? "Configuração validada para esta loja." : errorMessage,
  };
}

function requireSecret(
  context: StoreIntegrationContext,
  key: string,
  errorMessage: string,
): TestConnectionResult {
  const value = context.secrets[key];

  return {
    success: Boolean(value),
    message: value ? "Credencial segura encontrada para esta loja." : errorMessage,
  };
}

async function syncProductFeed(context: StoreIntegrationContext) {
  const count = await prisma.product.count({
    where: {
      storeId: context.storeId,
      status: "ACTIVE",
      showOnSite: true,
    },
  });

  return {
    success: true,
    message: `${count} produto(s) da loja preparados para feed/sincronização.`,
  };
}

async function syncProductsAndOrders(context: StoreIntegrationContext) {
  const [products, orders] = await Promise.all([
    prisma.product.count({ where: { storeId: context.storeId } }),
    prisma.order.count({ where: { storeId: context.storeId } }),
  ]);

  return {
    success: true,
    message: `${products} produto(s) e ${orders} pedido(s) da loja preparados para ERP.`,
  };
}

async function syncCustomers(context: StoreIntegrationContext) {
  const customers = await prisma.customer.count({
    where: {
      storeId: context.storeId,
      allowPromotions: true,
    },
  });

  return {
    success: true,
    message: `${customers} cliente(s) da loja preparados para marketing.`,
  };
}

async function syncOpenOrders(context: StoreIntegrationContext) {
  const orders = await prisma.order.count({
    where: {
      storeId: context.storeId,
      status: { in: ["PAID", "PROCESSING"] },
    },
  });

  return {
    success: true,
    message: `${orders} pedido(s) da loja preparados para frete/logística.`,
  };
}

async function syncFiscalOrders(context: StoreIntegrationContext) {
  const orders = await prisma.order.count({
    where: {
      storeId: context.storeId,
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
    },
  });

  return {
    success: true,
    message: `${orders} pedido(s) da loja preparados para emissão fiscal.`,
  };
}

async function syncSecurityOrders(context: StoreIntegrationContext) {
  const orders = await prisma.order.count({
    where: {
      storeId: context.storeId,
      status: { in: ["PENDING", "PAID", "PROCESSING"] },
    },
  });

  return {
    success: true,
    message: `${orders} pedido(s) da loja preparados para análise antifraude.`,
  };
}

async function syncGenericIntegration(context: StoreIntegrationContext) {
  const values = Object.keys(context.values).length;
  const secrets = Object.keys(context.secrets).length;

  return {
    success: true,
    message: `Configuração da loja pronta para sincronização (${values} campo(s), ${secrets} segredo(s)).`,
  };
}

async function logAndReturn(
  storeId: string,
  appId: string,
  action: string,
  success: boolean,
  message: string,
) {
  await createIntegrationLog({
    storeId,
    appId,
    action,
    status: success ? "success" : "skipped",
    message,
  });

  return { success, message };
}
