import QRCode from "qrcode";

type PixPayloadInput = {
  pixKeyType?: string;
  chavePix: string;
  nomeBeneficiario: string;
  cidadeBeneficiario: string;
  valorPedido: number;
  descricaoPedido?: string;
  txidPedido: string;
};

type LegacyPixPayloadInput = {
  pixKeyType?: string;
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  transactionId: string;
  description?: string;
};

export type PixPaymentPayload = {
  payload: string;
  copiaECola: string;
  emv: string;
  qrCodeDataUrl: string;
  qrCodeBase64: string;
};

export async function createPixPayment(input: LegacyPixPayloadInput): Promise<PixPaymentPayload> {
  return generatePixManual({
    pixKeyType: input.pixKeyType,
    chavePix: input.pixKey,
    nomeBeneficiario: input.merchantName,
    cidadeBeneficiario: input.merchantCity,
    valorPedido: input.amount,
    descricaoPedido: input.description,
    txidPedido: input.transactionId,
  });
}

export async function generatePixManual(input: PixPayloadInput): Promise<PixPaymentPayload> {
  const payload = buildPixPayload(input);
  const qrCodeDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
  });
  const qrCodeBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");

  return {
    payload,
    copiaECola: payload,
    emv: payload,
    qrCodeDataUrl,
    qrCodeBase64,
  };
}

export function buildPixPayload(input: PixPayloadInput) {
  validatePixInput(input);
  const pixKey = normalizePixKey(input.chavePix, input.pixKeyType);
  const merchantAccountInfo = tlv("00", "br.gov.bcb.pix") +
    tlv("01", pixKey) +
    (input.descricaoPedido ? tlv("02", sanitize(input.descricaoPedido, 72)) : "");
  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("01", "12"),
    tlv("26", merchantAccountInfo),
    tlv("52", "0000"),
    tlv("53", "986"),
    tlv("54", formatAmount(input.valorPedido)),
    tlv("58", "BR"),
    tlv("59", sanitize(input.nomeBeneficiario, 25)),
    tlv("60", sanitize(input.cidadeBeneficiario, 15)),
    tlv("62", tlv("05", sanitizeTxid(input.txidPedido))),
    "6304",
  ].join("");

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

function tlv(id: string, value: string) {
  const length = Buffer.byteLength(value, "utf8");
  return `${id}${String(length).padStart(2, "0")}${value}`;
}

function normalizePixKey(value: string, type?: string) {
  const pixKeyType = normalizeText(type ?? "").toUpperCase();
  const rawValue = value.trim();
  const digits = rawValue.replace(/\D/g, "");

  if (!rawValue) {
    throw new Error("Chave PIX não configurada.");
  }

  if (pixKeyType.includes("TELEFONE") || pixKeyType.includes("CELULAR")) {
    if (digits.length === 11) return `+55${digits}`;
    if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
    if (rawValue.startsWith("+") && digits.length >= 12) return `+${digits}`;

    throw new Error("Telefone PIX inválido. Informe DDD e número, exemplo: (45) 99999-9999.");
  }

  if (pixKeyType.includes("CPF") || pixKeyType.includes("CNPJ")) {
    if (digits.length === 11 || digits.length === 14) return digits;

    throw new Error("CPF/CNPJ PIX inválido.");
  }

  if (pixKeyType.includes("EMAIL") || pixKeyType.includes("E-MAIL")) {
    if (!rawValue.includes("@") && digits.length === 11) {
      return `+55${digits}`;
    }

    if (!rawValue.includes("@")) {
      throw new Error("E-mail PIX inválido. Se a chave for telefone, selecione o tipo Telefone.");
    }

    return rawValue.toLowerCase();
  }

  if (digits.length === 11 && !rawValue.includes("-")) return `+55${digits}`;
  if (digits.length === 14) return digits;

  return rawValue;
}

function validatePixInput(input: PixPayloadInput) {
  if (!input.chavePix?.trim()) {
    throw new Error("Chave PIX não configurada.");
  }

  if (!input.nomeBeneficiario?.trim()) {
    throw new Error("Nome do beneficiário não configurado.");
  }

  if (!input.cidadeBeneficiario?.trim()) {
    throw new Error("Cidade do beneficiário não configurada.");
  }

  if (!Number.isFinite(input.valorPedido) || input.valorPedido <= 0) {
    throw new Error("Valor do pedido inválido para gerar o PIX.");
  }

  if (!input.txidPedido?.trim()) {
    throw new Error("TXID do pedido não informado.");
  }
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function sanitize(value: string, maxLength: number) {
  return normalizeText(value)
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .slice(0, maxLength)
    .toUpperCase();
}

function sanitizeTxid(value: string) {
  return normalizeText(value)
    .replace(/[^A-Za-z0-9]/g, "")
    .trim()
    .slice(0, 25)
    .toUpperCase() || "***";
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}
