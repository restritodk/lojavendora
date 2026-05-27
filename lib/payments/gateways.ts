type GatewayPaymentStatus = "pending" | "approved" | "failed";

export type GatewayPaymentRequest = {
  gatewayId: string;
  kind: "api-pix" | "api-card";
  orderId: string;
  orderNumber: string;
  amount: number;
  description: string;
  payer: {
    name: string;
    email: string | null;
    document: string | null;
  };
  card?: {
    token: string;
    installments: number;
    payerDocument: string;
    paymentMethodId: string;
    paymentTypeId?: string;
  };
  credentials: Record<string, string | string[]>;
  storeSlug: string;
};

export type GatewayPaymentResult = {
  status: GatewayPaymentStatus;
  message: string;
  providerPaymentId?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixTicketUrl?: string;
  checkoutUrl?: string;
};

export type GatewayRefundRequest = {
  gatewayId: string;
  providerPaymentId: string;
  amount?: number;
  credentials: Record<string, string | string[]>;
};

export type GatewayStatusRequest = {
  gatewayId: string;
  providerPaymentId: string;
  orderId: string;
  credentials: Record<string, string | string[]>;
};

export type GatewayStatusResult = {
  status: GatewayPaymentStatus;
  message: string;
};

export type GatewayRefundResult = {
  status: "requested" | "refunded" | "failed";
  message: string;
  providerRefundId?: string;
};

type GatewayAdapter = {
  ids: string[];
  name: string;
  createPayment?: (request: GatewayPaymentRequest) => Promise<GatewayPaymentResult>;
  getPaymentStatus?: (request: GatewayStatusRequest) => Promise<GatewayStatusResult>;
  refundPayment: (request: GatewayRefundRequest) => Promise<GatewayRefundResult>;
};

export async function createGatewayPayment(
  request: GatewayPaymentRequest,
): Promise<GatewayPaymentResult> {
  const adapter = getGatewayAdapter(request.gatewayId);

  if (!adapter?.createPayment) {
    return {
      status: "failed",
      message: "Gateway ainda não implementado para cobrança automática.",
    };
  }

  return adapter.createPayment(request);
}

export async function refundGatewayPayment(
  request: GatewayRefundRequest,
): Promise<GatewayRefundResult> {
  const adapter = getGatewayAdapter(request.gatewayId);

  if (!adapter) {
    return manualRefund(request.gatewayId, "Gateway sem adaptador de estorno configurado.");
  }

  return adapter.refundPayment(request);
}

export async function checkGatewayPaymentStatus(
  request: GatewayStatusRequest,
): Promise<GatewayStatusResult> {
  const adapter = getGatewayAdapter(request.gatewayId);

  if (!adapter?.getPaymentStatus) {
    return {
      status: "pending",
      message: "Aguardando retorno do gateway configurado.",
    };
  }

  return adapter.getPaymentStatus(request);
}

async function createMercadoPagoPayment(
  request: GatewayPaymentRequest,
): Promise<GatewayPaymentResult> {
  const accessToken = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!accessToken) {
    return {
      status: "failed",
      message: "Access token do Mercado Pago não configurado.",
    };
  }

  if (request.kind === "api-pix") {
    return createMercadoPagoPix(request, accessToken);
  }

  if (request.card?.token) {
    return createMercadoPagoCardPayment(request, accessToken);
  }

  return {
    status: "failed",
    message: "Não foi possível tokenizar o cartão no checkout da loja. Confira os dados e tente novamente.",
  };
}

async function createMercadoPagoPix(
  request: GatewayPaymentRequest,
  accessToken: string,
): Promise<GatewayPaymentResult> {
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `vendora-${request.orderId}-pix`,
    },
    body: JSON.stringify({
      transaction_amount: Number(request.amount.toFixed(2)),
      description: request.description,
      payment_method_id: "pix",
      external_reference: request.orderId,
      payer: {
        email: request.payer.email || "comprador@vendora.local",
        first_name: request.payer.name,
        identification: buildIdentification(request.payer.document),
      },
    }),
  });
  const data = await response.json().catch(() => null) as MercadoPagoPaymentResponse | null;

  if (!response.ok || !data) {
    return {
      status: "failed",
      message: getMercadoPagoError(data) || "Não foi possível gerar o PIX Mercado Pago.",
    };
  }

  return {
    status: normalizeMercadoPagoStatus(data.status),
    message: "PIX Mercado Pago gerado. Pague pelo QR Code e aguarde a confirmação automática.",
    providerPaymentId: String(data.id ?? ""),
    pixQrCode: data.point_of_interaction?.transaction_data?.qr_code,
    pixQrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    pixTicketUrl: data.point_of_interaction?.transaction_data?.ticket_url,
  };
}

async function checkMercadoPagoPaymentStatus(request: GatewayStatusRequest): Promise<GatewayStatusResult> {
  const accessToken = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!accessToken) {
    return { status: "failed", message: "Access token do Mercado Pago não configurado." };
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${request.providerPaymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payment = await response.json().catch(() => null) as { status?: string; external_reference?: string } | null;

  if (!response.ok || !payment) {
    return { status: "pending", message: "Aguardando retorno do Mercado Pago." };
  }

  if (payment.external_reference && payment.external_reference !== request.orderId) {
    return { status: "failed", message: "Referência do pagamento inválida no Mercado Pago." };
  }

  return {
    status: normalizeMercadoPagoStatus(payment.status),
    message: payment.status === "approved"
      ? "Pagamento aprovado pelo Mercado Pago."
      : "Pagamento ainda aguardando confirmação no Mercado Pago.",
  };
}

async function createMercadoPagoCardPayment(
  request: GatewayPaymentRequest,
  accessToken: string,
): Promise<GatewayPaymentResult> {
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `vendora-${request.orderId}-card`,
    },
    body: JSON.stringify({
      transaction_amount: Number(request.amount.toFixed(2)),
      token: request.card?.token,
      description: request.description,
      installments: request.card?.installments || 1,
      payment_method_id: request.card?.paymentMethodId,
      external_reference: request.orderId,
      payer: {
        email: request.payer.email || "comprador@vendora.local",
        identification: buildIdentification(request.card?.payerDocument || request.payer.document),
      },
    }),
  });
  const data = await response.json().catch(() => null) as MercadoPagoPaymentResponse | null;

  if (!response.ok || !data) {
    return {
      status: "failed",
      message: getMercadoPagoError(data) || "Não foi possível processar o cartão no Mercado Pago.",
    };
  }

  return {
    status: normalizeMercadoPagoStatus(data.status),
    message: data.status === "approved"
      ? "Pagamento aprovado pelo Mercado Pago."
      : "Pagamento enviado ao Mercado Pago. Aguarde a confirmação.",
    providerPaymentId: String(data.id ?? ""),
  };
}

async function createPagSeguroPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResult> {
  const token = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!token) {
    return {
      status: "failed",
      message: "Token do PagSeguro/PagBank não configurado.",
    };
  }

  if (request.kind !== "api-pix") {
    return {
      status: "failed",
      message: "Pagamento por cartão PagSeguro/PagBank ainda precisa de tokenização própria do gateway.",
    };
  }

  const response = await fetch("https://api.pagseguro.com/charges", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-idempotency-key": `vendora-${request.orderId}-pagseguro-pix`,
    },
    body: JSON.stringify({
      reference_id: request.orderId,
      description: request.description,
      amount: {
        value: Math.round(request.amount * 100),
        currency: "BRL",
      },
      payment_method: {
        type: "PIX",
      },
      customer: {
        name: request.payer.name,
        email: request.payer.email || "comprador@vendora.local",
        tax_id: request.payer.document?.replace(/\D/g, "") || undefined,
      },
    }),
  });
  const data = await response.json().catch(() => null) as PagSeguroChargeResponse | null;

  if (!response.ok || !data) {
    return {
      status: "failed",
      message: getPagSeguroError(data) || "Não foi possível gerar o PIX PagSeguro/PagBank. Confira se o token informado pertence ao PagSeguro/PagBank.",
    };
  }

  const qrCode = data.qr_codes?.[0];

  return {
    status: normalizePagSeguroStatus(data.status),
    message: "PIX PagSeguro/PagBank gerado. Pague pelo QR Code e aguarde a confirmação automática.",
    providerPaymentId: data.id,
    pixQrCode: qrCode?.text,
    pixQrCodeBase64: normalizeQrCodeBase64(qrCode?.links),
  };
}

async function checkPagSeguroPaymentStatus(request: GatewayStatusRequest): Promise<GatewayStatusResult> {
  const token = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!token) {
    return { status: "failed", message: "Token do PagSeguro/PagBank não configurado." };
  }

  const response = await fetch(`https://api.pagseguro.com/charges/${request.providerPaymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json().catch(() => null) as PagSeguroChargeResponse | null;

  if (!response.ok || !data) {
    return { status: "pending", message: "Aguardando retorno do PagSeguro/PagBank." };
  }

  return {
    status: normalizePagSeguroStatus(data.status),
    message: data.status === "PAID" || data.status === "AUTHORIZED"
      ? "Pagamento aprovado pelo PagSeguro/PagBank."
      : "Pagamento ainda aguardando confirmação no PagSeguro/PagBank.",
  };
}

function buildIdentification(document: string | null) {
  const digits = document?.replace(/\D/g, "") ?? "";

  if (digits.length === 11) {
    return { type: "CPF", number: digits };
  }

  if (digits.length === 14) {
    return { type: "CNPJ", number: digits };
  }

  return undefined;
}

function normalizeMercadoPagoStatus(status: string | undefined): GatewayPaymentStatus {
  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected" || status === "cancelled") {
    return "failed";
  }

  return "pending";
}

function normalizePagSeguroStatus(status: string | undefined): GatewayPaymentStatus {
  if (status === "PAID" || status === "AUTHORIZED") {
    return "approved";
  }

  if (status === "CANCELED" || status === "DECLINED") {
    return "failed";
  }

  return "pending";
}

function getValue(values: Record<string, string | string[]>, key: string) {
  const value = values[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getPagSeguroError(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const value = data as {
    message?: unknown;
    error_messages?: Array<{ description?: unknown; code?: unknown }>;
  };

  if (Array.isArray(value.error_messages) && value.error_messages.length > 0) {
    return value.error_messages
      .map((item) => typeof item.description === "string" ? item.description : String(item.code ?? ""))
      .filter(Boolean)
      .join(" ");
  }

  return typeof value.message === "string" ? value.message : "";
}

function normalizeQrCodeBase64(links: Array<{ rel?: string; href?: string; media?: string; type?: string }> | undefined) {
  const imageLink = links?.find((link) =>
    link.media === "image/png" ||
    link.type === "image/png" ||
    link.rel === "QRCODE.PNG",
  );

  return imageLink?.href?.startsWith("data:image")
    ? imageLink.href.replace(/^data:image\/png;base64,/, "")
    : undefined;
}

function getMercadoPagoError(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const value = data as {
    message?: unknown;
    error?: unknown;
    cause?: Array<{ description?: unknown; code?: unknown }>;
  };

  if (Array.isArray(value.cause) && value.cause.length > 0) {
    const cause = value.cause
      .map((item) => typeof item.description === "string" ? item.description : String(item.code ?? ""))
      .filter(Boolean)
      .join(" ");

    if (cause) {
      return cause;
    }
  }

  return typeof value.message === "string"
    ? value.message
    : typeof value.error === "string"
      ? value.error
      : "";
}

const gatewayAdapters: GatewayAdapter[] = [
  {
    ids: ["mercado-pago", "mercado-pago-transparente"],
    name: "Mercado Pago",
    createPayment: createMercadoPagoPayment,
    getPaymentStatus: checkMercadoPagoPaymentStatus,
    refundPayment: refundMercadoPagoPayment,
  },
  {
    ids: ["pagseguro", "pagseguro-transparente"],
    name: "PagSeguro / PagBank",
    createPayment: createPagSeguroPayment,
    getPaymentStatus: checkPagSeguroPaymentStatus,
    refundPayment: refundPagSeguroPayment,
  },
  {
    ids: ["paypal"],
    name: "PayPal",
    refundPayment: refundPayPalPayment,
  },
  {
    ids: ["cielo", "cielo-transparente"],
    name: "Cielo",
    refundPayment: refundCieloPayment,
  },
  {
    ids: ["rede"],
    name: "Rede",
    refundPayment: refundRedePayment,
  },
  {
    ids: ["pagarme"],
    name: "Pagar.me",
    refundPayment: refundPagarmePayment,
  },
  {
    ids: ["picpay"],
    name: "PicPay",
    refundPayment: refundPicPayPayment,
  },
  {
    ids: ["paghiper"],
    name: "PagHiper",
    refundPayment: refundPagHiperPayment,
  },
  {
    ids: ["f2b"],
    name: "F2B",
    refundPayment: refundF2bPayment,
  },
  {
    ids: ["wirecard"],
    name: "Wirecard",
    refundPayment: refundWirecardPayment,
  },
];

function getGatewayAdapter(gatewayId: string) {
  return gatewayAdapters.find((adapter) => adapter.ids.includes(gatewayId));
}

async function refundMercadoPagoPayment(request: GatewayRefundRequest) {
  const accessToken = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!accessToken) {
    return manualRefund(request.gatewayId, "Access token do Mercado Pago não configurado.");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${request.providerPaymentId}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `vendora-refund-${request.providerPaymentId}`,
    },
    body: JSON.stringify(
      request.amount && request.amount > 0
        ? { amount: Number(request.amount.toFixed(2)) }
        : {},
    ),
  });
  const data = await response.json().catch(() => null) as MercadoPagoRefundResponse | null;

  if (!response.ok || !data) {
    return {
      status: "failed" as const,
      message: getMercadoPagoError(data) || "Não foi possível solicitar o estorno no Mercado Pago.",
    };
  }

  return {
    status: data.status === "approved" ? "refunded" as const : "requested" as const,
    message: data.status === "approved"
      ? "Estorno processado com sucesso pelo Mercado Pago."
      : "Estorno solicitado ao Mercado Pago.",
    providerRefundId: String(data.id ?? ""),
  };
}

async function refundPayPalPayment(request: GatewayRefundRequest) {
  const clientId = getValue(request.credentials, "publicKey") || getValue(request.credentials, "merchantId");
  const clientSecret = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");
  const baseUrl = getEnvironment(request.credentials) === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) {
    return manualRefund(request.gatewayId, "Client ID ou Client Secret do PayPal não configurado.");
  }

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenData = await tokenResponse.json().catch(() => null) as { access_token?: string; message?: string } | null;

  if (!tokenResponse.ok || !tokenData?.access_token) {
    return manualRefund(request.gatewayId, "Não foi possível autenticar no PayPal para estorno.");
  }

  const response = await fetch(`${baseUrl}/v2/payments/captures/${request.providerPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `vendora-refund-${request.providerPaymentId}`,
    },
    body: JSON.stringify(request.amount ? {
      amount: {
        value: request.amount.toFixed(2),
        currency_code: "BRL",
      },
    } : {}),
  });
  const data = await response.json().catch(() => null) as { id?: string; status?: string; message?: string } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      message: data?.message || "Não foi possível solicitar o estorno no PayPal.",
    };
  }

  return {
    status: data?.status === "COMPLETED" ? "refunded" as const : "requested" as const,
    message: data?.status === "COMPLETED" ? "Estorno processado pelo PayPal." : "Estorno solicitado ao PayPal.",
    providerRefundId: data?.id,
  };
}

async function refundCieloPayment(request: GatewayRefundRequest) {
  const merchantId = getValue(request.credentials, "merchantId") || getValue(request.credentials, "publicKey");
  const merchantKey = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");
  const baseUrl = getEnvironment(request.credentials) === "production"
    ? "https://apiquery.cieloecommerce.cielo.com.br"
    : "https://apiquerysandbox.cieloecommerce.cielo.com.br";

  if (!merchantId || !merchantKey) {
    return manualRefund(request.gatewayId, "Merchant ID ou Merchant Key da Cielo não configurado.");
  }

  const query = request.amount && request.amount > 0 ? `?amount=${Math.round(request.amount * 100)}` : "";
  const response = await fetch(`${baseUrl}/1/sales/${request.providerPaymentId}/void${query}`, {
    method: "PUT",
    headers: {
      MerchantId: merchantId,
      MerchantKey: merchantKey,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json().catch(() => null) as { ReasonMessage?: string; Status?: number; Payment?: { Tid?: string } } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      message: data?.ReasonMessage || "Não foi possível solicitar o estorno na Cielo.",
    };
  }

  return {
    status: "requested" as const,
    message: "Cancelamento/estorno solicitado na Cielo.",
    providerRefundId: data?.Payment?.Tid || request.providerPaymentId,
  };
}

async function refundRedePayment(request: GatewayRefundRequest) {
  const pv = getValue(request.credentials, "merchantId") || getValue(request.credentials, "publicKey");
  const token = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");
  const baseUrl = getEnvironment(request.credentials) === "production"
    ? "https://api.userede.com.br"
    : "https://sandbox-erede.useredecloud.com.br";

  if (!pv || !token) {
    return manualRefund(request.gatewayId, "PV ou token da Rede não configurado.");
  }

  const response = await fetch(`${baseUrl}/v1/transactions/${request.providerPaymentId}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${pv}:${token}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.amount ? { amount: Math.round(request.amount * 100) } : {}),
  });
  const data = await response.json().catch(() => null) as { returnMessage?: string; tid?: string; refundId?: string } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      message: data?.returnMessage || "Não foi possível solicitar o estorno na Rede.",
    };
  }

  return {
    status: "requested" as const,
    message: "Estorno solicitado na Rede.",
    providerRefundId: data?.refundId || data?.tid || request.providerPaymentId,
  };
}

async function refundPagarmePayment(request: GatewayRefundRequest) {
  const apiKey = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!apiKey) {
    return manualRefund(request.gatewayId, "API Key da Pagar.me não configurada.");
  }

  const response = await fetch(`https://api.pagar.me/core/v5/charges/${request.providerPaymentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.amount ? { amount: Math.round(request.amount * 100) } : {}),
  });
  const data = await response.json().catch(() => null) as { id?: string; status?: string; message?: string; errors?: unknown } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      message: data?.message || "Não foi possível solicitar o estorno na Pagar.me.",
    };
  }

  return {
    status: data?.status === "canceled" ? "refunded" as const : "requested" as const,
    message: data?.status === "canceled" ? "Estorno processado pela Pagar.me." : "Estorno solicitado na Pagar.me.",
    providerRefundId: data?.id,
  };
}

async function refundPagSeguroPayment(request: GatewayRefundRequest) {
  const token = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!token) {
    return manualRefund(request.gatewayId, "Token do PagSeguro/PagBank não configurado.");
  }

  const response = await fetch(`https://api.pagseguro.com/charges/${request.providerPaymentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-idempotency-key": `vendora-refund-${request.providerPaymentId}`,
    },
    body: JSON.stringify(request.amount ? { amount: { value: Math.round(request.amount * 100) } } : {}),
  });
  const data = await response.json().catch(() => null) as { id?: string; status?: string; message?: string; error_messages?: Array<{ description?: string }> } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      message: data?.error_messages?.[0]?.description || data?.message || "Não foi possível solicitar o estorno no PagSeguro/PagBank.",
    };
  }

  return {
    status: data?.status === "CANCELED" ? "refunded" as const : "requested" as const,
    message: data?.status === "CANCELED" ? "Estorno processado pelo PagSeguro/PagBank." : "Estorno solicitado no PagSeguro/PagBank.",
    providerRefundId: data?.id,
  };
}

async function refundPicPayPayment(request: GatewayRefundRequest) {
  const token = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");

  if (!token) {
    return manualRefund(request.gatewayId, "Token do PicPay não configurado.");
  }

  const response = await fetch(`https://appws.picpay.com/ecommerce/public/payments/${request.providerPaymentId}/cancellations`, {
    method: "POST",
    headers: {
      "x-picpay-token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.amount ? { amount: Number(request.amount.toFixed(2)) } : {}),
  });
  const data = await response.json().catch(() => null) as { cancellationId?: string; message?: string; status?: string } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      message: data?.message || "Não foi possível solicitar o estorno no PicPay.",
    };
  }

  return {
    status: "requested" as const,
    message: "Estorno solicitado no PicPay.",
    providerRefundId: data?.cancellationId,
  };
}

async function refundPagHiperPayment(request: GatewayRefundRequest) {
  const token = getValue(request.credentials, "secretKey") || getValue(request.credentials, "clientSecret");
  const apiKey = getValue(request.credentials, "publicKey") || getValue(request.credentials, "merchantId");

  if (!token || !apiKey) {
    return manualRefund(request.gatewayId, "Token ou API Key da PagHiper não configurado.");
  }

  const response = await fetch("https://api.paghiper.com/transaction/cancel/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      apiKey,
      transaction_id: request.providerPaymentId,
    }),
  });
  const data = await response.json().catch(() => null) as { status_request?: string; status_response?: string; response_message?: string; transaction_id?: string } | null;

  if (!response.ok || data?.status_request === "error") {
    return {
      status: "failed" as const,
      message: data?.response_message || "Não foi possível solicitar o cancelamento na PagHiper.",
    };
  }

  return {
    status: "requested" as const,
    message: "Cancelamento/estorno solicitado na PagHiper.",
    providerRefundId: data?.transaction_id || request.providerPaymentId,
  };
}

async function refundF2bPayment(request: GatewayRefundRequest) {
  return manualRefund(request.gatewayId, "A F2B exige confirmação via credenciais/endpoint contratados da conta. Estorno registrado para execução manual.");
}

async function refundWirecardPayment(request: GatewayRefundRequest) {
  return manualRefund(request.gatewayId, "Wirecard/Moip pode exigir endpoint legado específico da conta. Estorno registrado para execução manual.");
}

function manualRefund(gatewayId: string, reason: string): GatewayRefundResult {
  const adapter = getGatewayAdapter(gatewayId);

  return {
    status: "requested",
    message: `Estorno pendente manual${adapter ? ` (${adapter.name})` : ""}: ${reason}`,
  };
}

function getEnvironment(credentials: Record<string, string | string[]>) {
  const environment = getValue(credentials, "environment").toLowerCase();
  return environment === "production" || environment === "producao" || environment === "prod"
    ? "production"
    : "sandbox";
}

type MercadoPagoPaymentResponse = {
  id?: string | number;
  status?: string;
  message?: string;
  error?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

type PagSeguroChargeResponse = {
  id?: string;
  status?: string;
  message?: string;
  error_messages?: Array<{ description?: string; code?: string }>;
  qr_codes?: Array<{
    text?: string;
    links?: Array<{
      rel?: string;
      href?: string;
      media?: string;
      type?: string;
    }>;
  }>;
};

type MercadoPagoRefundResponse = {
  id?: string | number;
  status?: string;
  message?: string;
  error?: string;
  cause?: Array<{ description?: unknown; code?: unknown }>;
};
