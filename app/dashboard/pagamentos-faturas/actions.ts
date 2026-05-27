"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { getOpenPlatformInvoice } from "@/lib/platform-billing";
import { createPlatformMercadoPagoPayment } from "@/lib/platform-payments/mercado-pago";

export type BillingPaymentResult = {
  type: "success" | "pending" | "error";
  message: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixTicketUrl?: string;
};

export async function payPlatformInvoiceAction(formData: FormData): Promise<BillingPaymentResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const invoiceId = getValue(formData, "invoiceId");
  const method = getValue(formData, "method");

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  if (!invoiceId || (method !== "PIX" && method !== "CARD")) {
    return result("error", "Dados de pagamento inválidos.");
  }

  const invoice = await getOpenPlatformInvoice(store.id, invoiceId);

  if (!invoice) {
    return result("error", "Fatura não encontrada para esta loja ou já quitada.");
  }

  if (method === "CARD") {
    const token = getValue(formData, "cardToken");
    const paymentMethodId = getValue(formData, "paymentMethodId");
    const payerDocument = onlyDigits(getValue(formData, "payerDocument"));
    const installments = Number(getValue(formData, "installments") || "1");

    if (!token || !paymentMethodId || !payerDocument) {
      return result(
        "error",
        "Para pagamento com cartão, informe o token do cartão, bandeira e CPF/CNPJ do pagador.",
      );
    }

    const payment = await createPlatformMercadoPagoPayment({
      invoiceId: invoice.id,
      amount: Number(invoice.amount),
      description: `Mensalidade Vendora ${invoice.referenceMonth}`,
      payer: {
        email: user.email,
        name: user.name ?? store.name,
      },
      method: "CARD",
      card: {
        token,
        paymentMethodId,
        installments: Number.isFinite(installments) && installments > 0 ? installments : 1,
        payerDocument,
      },
    });

    revalidatePath("/dashboard/pagamentos-faturas");
    return payment;
  }

  const payment = await createPlatformMercadoPagoPayment({
    invoiceId: invoice.id,
    amount: Number(invoice.amount),
    description: `Mensalidade Vendora ${invoice.referenceMonth}`,
    payer: {
      email: user.email,
      name: user.name ?? store.name,
    },
    method: "PIX",
  });

  revalidatePath("/dashboard/pagamentos-faturas");
  return payment;
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function result(type: BillingPaymentResult["type"], message: string): BillingPaymentResult {
  return { type, message };
}
