import { PlatformInvoicePaymentMethod, PlatformPaymentAttemptStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type MercadoPagoPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

type CreatePlatformPaymentInput = {
  invoiceId: string;
  amount: number;
  description: string;
  payer: {
    email: string;
    name: string;
  };
  method: "PIX" | "CARD";
  card?: {
    token: string;
    installments: number;
    paymentMethodId: string;
    payerDocument: string;
  };
};

export async function getPlatformMercadoPagoSettings() {
  return prisma.platformPaymentSetting.findUnique({
    where: { provider: "mercado-pago" },
  });
}

export async function createPlatformMercadoPagoPayment(input: CreatePlatformPaymentInput) {
  const settings = await getPlatformMercadoPagoSettings();

  if (!settings?.active || !settings.accessToken) {
    return {
      type: "error" as const,
      message: "Mercado Pago da plataforma não configurado pelo proprietário.",
    };
  }

  const idempotencyKey = `vendora-platform-${input.invoiceId}-${input.method.toLowerCase()}-${crypto.randomUUID()}`;
  const payload = buildPaymentPayload(input);
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null) as MercadoPagoPaymentResponse | null;
  const providerPaymentId = data?.id ? String(data.id) : undefined;
  const approved = data?.status === "approved";
  const pending = data?.status === "pending" || data?.status === "in_process";

  const attempt = await prisma.platformInvoicePaymentAttempt.create({
    data: {
      invoiceId: input.invoiceId,
      method: input.method === "PIX" ? PlatformInvoicePaymentMethod.PIX : PlatformInvoicePaymentMethod.CARD,
      status: approved
        ? PlatformPaymentAttemptStatus.APPROVED
        : pending
          ? PlatformPaymentAttemptStatus.PENDING
          : PlatformPaymentAttemptStatus.FAILED,
      providerPaymentId,
      amount: input.amount,
      message: getMercadoPagoMessage(data, response.ok),
      response: data ?? {},
    },
  });

  if (approved && providerPaymentId) {
    await prisma.platformInvoice.update({
      where: { id: input.invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        provider: "mercado-pago",
        providerPaymentId,
        paymentMethod: input.method === "PIX" ? "PIX" : "CARD",
        paymentData: data ?? {},
        subscription: {
          update: { status: "ACTIVE" },
        },
      },
    });
  }

  if (!response.ok || !data) {
    return {
      type: "error" as const,
      message: "Não foi possível criar o pagamento no Mercado Pago da plataforma.",
      attempt,
    };
  }

  return {
    type: approved ? "success" as const : "pending" as const,
    message: getMercadoPagoMessage(data, response.ok),
    attempt,
    providerPaymentId,
    pixQrCode: data.point_of_interaction?.transaction_data?.qr_code,
    pixQrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    pixTicketUrl: data.point_of_interaction?.transaction_data?.ticket_url,
    publicKey: settings.publicKey,
  };
}

function buildPaymentPayload(input: CreatePlatformPaymentInput) {
  const base = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description,
    external_reference: input.invoiceId,
    payer: {
      email: input.payer.email || "lojista@vendora.local",
      first_name: input.payer.name,
      identification: input.card?.payerDocument
        ? {
            type: input.card.payerDocument.length > 11 ? "CNPJ" : "CPF",
            number: input.card.payerDocument,
          }
        : undefined,
    },
  };

  if (input.method === "PIX") {
    return {
      ...base,
      payment_method_id: "pix",
    };
  }

  return {
    ...base,
    token: input.card?.token,
    installments: input.card?.installments || 1,
    payment_method_id: input.card?.paymentMethodId,
  };
}

function getMercadoPagoMessage(data: MercadoPagoPaymentResponse | null, ok: boolean) {
  if (!ok) {
    return data?.status_detail || "Pagamento recusado pelo Mercado Pago.";
  }

  if (data?.status === "approved") {
    return "Pagamento aprovado.";
  }

  if (data?.status === "pending" || data?.status === "in_process") {
    return "Pagamento criado e aguardando confirmação.";
  }

  return data?.status_detail || "Pagamento criado.";
}
