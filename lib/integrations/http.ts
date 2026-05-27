import "server-only";
import { createIntegrationLog, type StoreIntegrationContext } from "./settings";

type IntegrationFetchOptions = RequestInit & {
  action: string;
  timeoutMs?: number;
};

export async function integrationFetch(
  context: StoreIntegrationContext,
  url: string,
  { action, timeoutMs = 10000, ...options }: IntegrationFetchOptions,
) {
  assertStoreScopedContext(context);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    await createIntegrationLog({
      storeId: context.storeId,
      appId: context.appId,
      action,
      status: response.ok ? "success" : "error",
      message: response.ok
        ? `Chamada ${action} concluída.`
        : `Chamada ${action} falhou com status ${response.status}.`,
      metadata: {
        url,
        status: response.status,
      },
    });

    return response;
  } catch (error) {
    await createIntegrationLog({
      storeId: context.storeId,
      appId: context.appId,
      action,
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido na integração.",
      metadata: { url },
    });

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function assertStoreScopedContext(context: StoreIntegrationContext) {
  if (!context.storeId || !context.appId) {
    throw new Error("Integração sem escopo de loja.");
  }
}
