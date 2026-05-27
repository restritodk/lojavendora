import "server-only";
import {
  syncLogisticsIntegration,
  syncSecurityIntegration,
} from "./domain-services";
import { isStoreAppActive, type StoreAdvancedSettingMap } from "@/lib/store-advanced-settings";

const logisticsApps = ["melhor-envio", "kangu", "sigep-correios", "bling", "nfe"];
const securityApps = ["clearsale-start", "clearsale-total", "clearsale-auth", "konduto"];

export async function syncOrderIntegrationsForStore(
  storeId: string,
  settings: StoreAdvancedSettingMap,
) {
  const activeLogistics = logisticsApps.filter((appId) => isStoreAppActive(settings, appId));
  const activeSecurity = securityApps.filter((appId) => isStoreAppActive(settings, appId));

  await Promise.all([
    ...activeLogistics.map((appId) => syncLogisticsIntegration(storeId, appId)),
    ...activeSecurity.map((appId) => syncSecurityIntegration(storeId, appId)),
  ]);
}
