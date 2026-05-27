import { prisma } from "@/lib/prisma";

export type StoreAdvancedValues = Record<string, string | string[]>;

export type StoreAdvancedSettingMap = Record<
  string,
  {
    active: boolean;
    values: StoreAdvancedValues;
  }
>;

export async function getStoreAdvancedSettings(storeId: string) {
  const settings = await prisma.storeAdvancedSetting.findMany({
    where: { storeId },
    select: {
      featureId: true,
      active: true,
      values: true,
    },
  });

  return settings.reduce<StoreAdvancedSettingMap>((settingsMap, setting) => {
    settingsMap[setting.featureId] = {
      active: setting.active,
      values: normalizeValues(setting.values),
    };

    return settingsMap;
  }, {});
}

export function isAdvancedFeatureActive(
  settings: StoreAdvancedSettingMap,
  featureId: string,
) {
  return settings[featureId]?.active ?? false;
}

export function isStoreAppActive(
  settings: StoreAdvancedSettingMap | undefined,
  appId: string,
) {
  return settings?.[`app:${appId}`]?.active ?? false;
}

export function getStoreAppValue(
  settings: StoreAdvancedSettingMap | undefined,
  appId: string,
  key: string,
  fallback = "",
) {
  if (!settings) {
    return fallback;
  }

  return getAdvancedFeatureValue(settings, `app:${appId}`, key, fallback);
}

export function getStoreAppUrl(
  settings: StoreAdvancedSettingMap | undefined,
  appId: string,
  key: string,
) {
  const value = getStoreAppValue(settings, appId, key);

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function isStorePaymentActive(
  settings: StoreAdvancedSettingMap | undefined,
  paymentId: string,
) {
  return settings?.[`payment:${paymentId}`]?.active ?? false;
}

export function getStorePaymentValue(
  settings: StoreAdvancedSettingMap | undefined,
  paymentId: string,
  key: string,
  fallback = "",
) {
  if (!settings) {
    return fallback;
  }

  return getAdvancedFeatureValue(settings, `payment:${paymentId}`, key, fallback);
}

export function getActiveStorePayments(settings: StoreAdvancedSettingMap | undefined) {
  if (!settings) {
    return [];
  }

  return Object.entries(settings)
    .filter(([featureId, setting]) => featureId.startsWith("payment:") && setting.active)
    .map(([featureId, setting]) => ({
      id: featureId.replace("payment:", ""),
      values: setting.values,
    }));
}

export function getAdvancedFeatureValue(
  settings: StoreAdvancedSettingMap,
  featureId: string,
  key: string,
  fallback = "",
) {
  const value = settings[featureId]?.values[key];

  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function normalizeValues(value: unknown): StoreAdvancedValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string | string[]] => {
    const [, entryValue] = entry;

    return (
      typeof entryValue === "string" ||
      (Array.isArray(entryValue) &&
        entryValue.every((item) => typeof item === "string"))
    );
  });

  return Object.fromEntries(entries);
}
