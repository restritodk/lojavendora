"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";

const allowedPaymentMethods = new Set([
  "customizado",
  "pix-deposito",
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

export type PaymentMethodResult = {
  type: "success" | "error";
  message: string;
};

export async function savePaymentMethodAction(
  paymentMethodId: string,
  formData: FormData,
): Promise<PaymentMethodResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "pagamentos");

  if (!allowedPaymentMethods.has(paymentMethodId)) {
    return result("error", "Forma de pagamento inválida.");
  }

  const formGatewayId = getValue(formData, "gatewayId").trim();

  if (formGatewayId && formGatewayId !== paymentMethodId) {
    return result("error", "As credenciais informadas não pertencem a esta forma de pagamento.");
  }

  const title = getValue(formData, "title").trim() || getValue(formData, "gatewayName").trim();

  if (!title) {
    return result("error", "Informe o título do pagamento.");
  }

  const values = collectValues(formData);
  const credentialError = validateGatewayCredentials(paymentMethodId, values);

  if (credentialError) {
    return result("error", credentialError);
  }

  await prisma.storeAdvancedSetting.upsert({
    where: {
      storeId_featureId: {
        storeId: store.id,
        featureId: `payment:${paymentMethodId}`,
      },
    },
    update: {
      active: getValue(formData, "__active") === "true",
      values,
    },
    create: {
      storeId: store.id,
      featureId: `payment:${paymentMethodId}`,
      active: getValue(formData, "__active") === "true",
      values,
    },
  });

  revalidatePath("/dashboard/configuracoes/formas-de-pagamento");
  revalidatePath(`/store/${store.subdomain}`);

  return result("success", "Forma de pagamento salva para esta loja.");
}

function collectValues(formData: FormData) {
  const values: Record<string, string | string[]> = {};

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

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateGatewayCredentials(paymentMethodId: string, values: Record<string, string | string[]>) {
  const detectedGateway = detectCredentialGateway(values);

  if (!detectedGateway) {
    return null;
  }

  if (isSameGatewayFamily(paymentMethodId, detectedGateway)) {
    return null;
  }

  return `As credenciais informadas parecem ser da API ${gatewayLabel(detectedGateway)}, mas você está configurando ${gatewayLabel(paymentMethodId)}. Use apenas tokens e chaves da própria forma de pagamento escolhida.`;
}

function detectCredentialGateway(values: Record<string, string | string[]>) {
  const credentials = [
    values.publicKey,
    values.secretKey,
    values.merchantId,
    values.clientSecret,
    values.webhookSecret,
  ]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (credentials.some(isMercadoPagoCredential)) {
    return "mercado-pago";
  }

  return "";
}

function isMercadoPagoCredential(value: string) {
  return (
    /^APP_USR-/i.test(value) ||
    /^TEST-/i.test(value) ||
    /^APP_USR/i.test(value) ||
    /mercadopago/i.test(value)
  );
}

function isSameGatewayFamily(paymentMethodId: string, detectedGateway: string) {
  return gatewayFamily(paymentMethodId) === gatewayFamily(detectedGateway);
}

function gatewayFamily(paymentMethodId: string) {
  if (paymentMethodId.startsWith("mercado-pago")) return "mercado-pago";
  if (paymentMethodId.startsWith("pagseguro")) return "pagseguro";
  if (paymentMethodId.startsWith("cielo")) return "cielo";
  return paymentMethodId;
}

function gatewayLabel(paymentMethodId: string) {
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

  return labels[paymentMethodId] ?? paymentMethodId;
}

function result(
  type: PaymentMethodResult["type"],
  message: string,
): PaymentMethodResult {
  return { type, message };
}
