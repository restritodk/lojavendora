import { NextResponse } from "next/server";
import { confirmOrderPayment } from "@/lib/orders/payment-lifecycle";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");

  if (topic === "payment") {
    return handleMercadoPagoWebhook(request);
  }

  return handleGenericWebhook(request);
}

async function handleGenericWebhook(request: Request) {
  const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  if (request.headers.get("x-webhook-secret") !== expectedSecret) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as {
    storeId?: unknown;
    orderId?: unknown;
    status?: unknown;
  } | null;

  if (!payload || typeof payload.storeId !== "string" || typeof payload.orderId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (payload.status !== "paid") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await confirmOrderPayment(payload.orderId, payload.storeId, "webhook");

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

async function handleMercadoPagoWebhook(request: Request) {
  const payload = await request.json().catch(() => null) as {
    data?: { id?: unknown };
    id?: unknown;
  } | null;
  const paymentId = typeof payload?.data?.id === "string" || typeof payload?.data?.id === "number"
    ? String(payload.data.id)
    : typeof payload?.id === "string" || typeof payload?.id === "number"
      ? String(payload.id)
      : "";

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const order = await prisma.order.findFirst({
    where: {
      integrationStatus: {
        path: ["gatewayPayment", "providerPaymentId"],
        equals: paymentId,
      },
    },
    select: {
      id: true,
      storeId: true,
      paymentMethod: true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!order.paymentMethod?.startsWith("mercado-pago:") && !order.paymentMethod?.startsWith("mercado-pago-transparente:")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const setting = await prisma.storeAdvancedSetting.findFirst({
    where: {
      storeId: order.storeId,
      featureId: {
        in: [
          "payment:mercado-pago",
          "payment:mercado-pago-transparente",
        ],
      },
      active: true,
    },
    select: {
      values: true,
    },
  });
  const accessToken = getPaymentCredential(setting?.values, "secretKey") || getPaymentCredential(setting?.values, "clientSecret");

  if (!accessToken) {
    return NextResponse.json({ error: "Mercado Pago sem token configurado." }, { status: 400 });
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payment = await response.json().catch(() => null) as {
    status?: string;
    external_reference?: string;
  } | null;

  if (!response.ok || !payment) {
    return NextResponse.json({ error: "Não foi possível consultar o pagamento." }, { status: 400 });
  }

  if (payment.external_reference && payment.external_reference !== order.id) {
    return NextResponse.json({ error: "Referência do pagamento inválida." }, { status: 400 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true, status: payment.status ?? "pending" });
  }

  const result = await confirmOrderPayment(order.id, order.storeId, "mercado-pago");

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

function getPaymentCredential(values: unknown, key: string) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return "";
  }

  const value = (values as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? typeof value[0] === "string" ? value[0] : ""
    : typeof value === "string"
      ? value
      : "";
}
