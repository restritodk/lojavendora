import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppCatalogEntry, isAllowedAppId } from "./app-catalog";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./crypto";

type IntegrationValues = Record<string, string | string[]>;

export type StoreIntegrationContext = {
  storeId: string;
  appId: string;
  active: boolean;
  values: IntegrationValues;
  secrets: Record<string, string>;
};

export async function saveStoreIntegrationSettings({
  storeId,
  appId,
  active,
  values,
}: {
  storeId: string;
  appId: string;
  active: boolean;
  values: IntegrationValues;
}) {
  const app = getAppCatalogEntry(appId);

  if (!app || !isAllowedAppId(appId)) {
    throw new Error("Aplicativo inválido.");
  }

  const { publicValues, secretValues } = splitValues(values, app.sensitiveFields);

  await prisma.$transaction(async (tx) => {
    await tx.storeAdvancedSetting.upsert({
      where: {
        storeId_featureId: {
          storeId,
          featureId: `app:${appId}`,
        },
      },
      update: {
        active,
        values: publicValues,
      },
      create: {
        storeId,
        featureId: `app:${appId}`,
        active,
        values: publicValues,
      },
    });

    for (const [key, value] of Object.entries(secretValues)) {
      await tx.storeIntegrationSecret.upsert({
        where: {
          storeId_appId_key: {
            storeId,
            appId,
            key,
          },
        },
        update: {
          value: encryptIntegrationSecret(value),
        },
        create: {
          storeId,
          appId,
          key,
          value: encryptIntegrationSecret(value),
        },
      });
    }

    await tx.storeIntegrationLog.create({
      data: {
        storeId,
        appId,
        action: "save-settings",
        status: "success",
        message: active ? "Aplicativo ativado para a loja." : "Aplicativo desativado para a loja.",
        metadata: {
          publicFields: Object.keys(publicValues),
          secretFields: Object.keys(secretValues),
        },
      },
    });
  });
}

export async function getStoreIntegrationContext(storeId: string, appId: string) {
  if (!isAllowedAppId(appId)) {
    return null;
  }

  const [setting, secrets] = await Promise.all([
    prisma.storeAdvancedSetting.findUnique({
      where: {
        storeId_featureId: {
          storeId,
          featureId: `app:${appId}`,
        },
      },
      select: {
        active: true,
        values: true,
      },
    }),
    prisma.storeIntegrationSecret.findMany({
      where: {
        storeId,
        appId,
      },
      select: {
        key: true,
        value: true,
      },
    }),
  ]);

  if (!setting) {
    return null;
  }

  return {
    storeId,
    appId,
    active: setting.active,
    values: normalizeValues(setting.values),
    secrets: Object.fromEntries(
      secrets.map((secret) => [secret.key, decryptIntegrationSecret(secret.value)]),
    ),
  } satisfies StoreIntegrationContext;
}

export async function createIntegrationLog({
  storeId,
  appId,
  action,
  status,
  message,
  metadata = {},
}: {
  storeId: string;
  appId: string;
  action: string;
  status: "success" | "error" | "pending" | "skipped";
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.storeIntegrationLog.create({
    data: {
      storeId,
      appId,
      action,
      status,
      message,
      metadata,
    },
  });
}

function splitValues(values: IntegrationValues, sensitiveFields: string[]) {
  const sensitiveFieldSet = new Set(sensitiveFields);
  const publicValues: IntegrationValues = {};
  const secretValues: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (sensitiveFieldSet.has(key)) {
      const secret = Array.isArray(value) ? value[0] : value;
      if (secret) {
        secretValues[key] = secret;
      }
      continue;
    }

    publicValues[key] = value;
  }

  return { publicValues, secretValues };
}

function normalizeValues(value: unknown): IntegrationValues {
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
