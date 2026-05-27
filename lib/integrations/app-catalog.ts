export type IntegrationCategory =
  | "site"
  | "marketing"
  | "attendance"
  | "logistics"
  | "marketplace"
  | "security";

export type IntegrationMode = "widget" | "api" | "feed" | "hybrid";

export type AppCatalogEntry = {
  id: string;
  title: string;
  category: IntegrationCategory;
  mode: IntegrationMode;
  sensitiveFields: string[];
  publicFields: string[];
};

export const appCatalog = [
  entry("estoque-acabando", "Está acabando", "site", "widget", [], []),
  entry("meta-brinde", "Meta para brinde", "site", "widget", [], ["goalValue", "giftName"]),
  entry("pontos-cashback", "Créditos e Cashback", "site", "api", [], ["cashbackPercent", "creditValidity"]),
  entry("lista-casamento", "Lista de casamento", "site", "api", [], []),
  entry("wish-list", "Wish List", "site", "api", [], []),
  entry("google-tag-manager", "Google Tag Manager", "marketing", "widget", [], ["containerId"]),
  entry("google-shopping", "Google Shopping", "marketing", "feed", [], ["merchantId"]),
  entry("facebook-instagram", "Facebook Shop & Instagram Shopping", "marketing", "hybrid", [], ["pixelId", "catalogId"]),
  entry("google-analytics", "Google Analytics", "marketing", "widget", [], ["measurementId"]),
  entry("shop-back", "ShopBack", "marketing", "widget", [], ["accountId"]),
  entry("yandex-metrica", "Yandex Métrica", "marketing", "widget", [], ["counterId"]),
  entry("sumo", "Sumo", "marketing", "widget", [], ["siteId"]),
  entry("mailchimp", "MailChimp", "marketing", "api", ["apiKey"], ["audienceId"]),
  entry("rd-station", "RD Station / Marketing", "marketing", "api", ["clientSecret"], ["clientId"]),
  entry("trusted", "Trusted Company", "attendance", "widget", [], ["storeCode"]),
  entry("jivochat", "JivoChat", "attendance", "widget", [], ["widgetId"]),
  entry("whatsapp", "WhatsApp", "attendance", "widget", [], ["phone", "message"]),
  entry("disqus", "Disqus", "attendance", "widget", [], ["shortname"]),
  entry("facebook-comments", "Facebook Comments", "attendance", "widget", [], ["appId"]),
  entry("yourviews", "Yourviews", "attendance", "hybrid", ["token"], []),
  entry("trustvox", "Trustvox", "attendance", "widget", [], ["storeId"]),
  entry("zendesk", "Zendesk", "attendance", "widget", [], ["subdomain"]),
  entry("sigep-correios", "Sigep Correios", "logistics", "api", ["password"], ["adminCode"]),
  entry("melhor-envio", "Melhor Envio", "logistics", "api", ["token"], []),
  entry("nfe", "NF-e", "logistics", "api", [], ["cnpj", "notes"]),
  entry("enviou", "Enviou", "marketing", "api", ["token"], []),
  entry("bling", "Bling", "logistics", "api", ["clientSecret"], ["clientId"]),
  entry("kangu", "Kangu", "logistics", "api", ["token"], []),
  entry("facebook-xml", "Facebook XML", "marketplace", "feed", [], ["feedName"]),
  entry("mercado-livre", "Mercado Livre", "marketplace", "api", [], ["userId"]),
  entry("clearsale-start", "ClearSale Start", "security", "api", [], ["storeCode"]),
  entry("clearsale-total", "ClearSale Total", "security", "api", ["appSecret"], ["appKey"]),
  entry("konduto", "Konduto", "security", "hybrid", ["privateKey"], ["publicKey"]),
  entry("clearsale-auth", "ClearSale Auth", "security", "api", ["token"], []),
] as const satisfies AppCatalogEntry[];

export const allowedAppIds = new Set(appCatalog.map((app) => app.id));

export const appCatalogById = new Map(appCatalog.map((app) => [app.id, app]));

export function getAppCatalogEntry(appId: string) {
  return appCatalogById.get(appId);
}

export function isAllowedAppId(appId: string) {
  return allowedAppIds.has(appId);
}

function entry(
  id: string,
  title: string,
  category: IntegrationCategory,
  mode: IntegrationMode,
  sensitiveFields: string[],
  publicFields: string[],
): AppCatalogEntry {
  return { id, title, category, mode, sensitiveFields, publicFields };
}
