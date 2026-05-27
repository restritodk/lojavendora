import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { markPlatformInvoicePaid } from "@/lib/platform-billing";
import { getPlatformMercadoPagoSettings } from "@/lib/platform-payments/mercado-pago";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const paymentId = getPaymentId(payload);

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const settings = await getPlatformMercadoPagoSettings();

  if (!settings?.active || !settings.accessToken) {
    return NextResponse.json({ ok: false, error: "Platform Mercado Pago not configured" }, { status: 400 });
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
    },
  });
  const payment = await response.json().catch(() => null) as PaymentLookupResponse | null;

  if (!response.ok || !payment) {
    return NextResponse.json({ ok: false, error: "Payment lookup failed" }, { status: 400 });
  }

  const invoiceId = typeof payment.external_reference === "string" ? payment.external_reference : "";
  const invoice = invoiceId
    ? await prisma.platformInvoice.findUnique({ where: { id: invoiceId } })
    : await prisma.platformInvoice.findFirst({
        where: { providerPaymentId: String(paymentId) },
      });

  if (!invoice) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const method = getPaymentMethod(payment);

  await prisma.platformInvoicePaymentAttempt.updateMany({
    where: {
      invoiceId: invoice.id,
      providerPaymentId: String(paymentId),
    },
    data: {
      status: payment.status === "approved" ? "APPROVED" : payment.status === "rejected" ? "FAILED" : "PENDING",
      response: payment as Prisma.InputJsonValue,
    },
  });

  if (payment.status === "approved") {
    await markPlatformInvoicePaid({
      invoiceId: invoice.id,
      providerPaymentId: String(paymentId),
      method,
      response: payment as Prisma.InputJsonValue,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  return POST(new Request(request.url, {
    method: "POST",
    body: JSON.stringify({ data: { id: paymentId } }),
  }));
}

function getPaymentId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const data = "data" in payload ? (payload as { data?: unknown }).data : null;
  if (data && typeof data === "object" && "id" in data) {
    return String((data as { id?: unknown }).id ?? "");
  }

  if ("id" in payload) {
    return String((payload as { id?: unknown }).id ?? "");
  }

  return "";
}

type PaymentLookupResponse = Record<string, Prisma.InputJsonValue> & {
  external_reference?: string;
  payment_method_id?: string;
  status?: string;
};

function getPaymentMethod(payment: PaymentLookupResponse): "PIX" | "CARD" {
  return payment.payment_method_id === "pix" ? "PIX" : "CARD";
}
