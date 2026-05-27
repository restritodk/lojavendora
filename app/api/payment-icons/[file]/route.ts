import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowedIcons = new Set([
  "boleto.png",
  "cielo.png",
  "cielo_integrado.png",
  "customizado.png",
  "deposito.png",
  "f2b.png",
  "mercado_pago.png",
  "mercado_pago_api.png",
  "pagarme.png",
  "paghiper.png",
  "pagseguro.png",
  "pagseguro_transparente.png",
  "paypal_grande.png",
  "picpay.png",
  "rede.png",
  "wirecard.png",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!allowedIcons.has(file)) {
    return new NextResponse("Icone nao encontrado.", { status: 404 });
  }

  const iconPath = path.join(process.cwd(), "img", "iconespagamentos", file);
  const icon = await readFile(iconPath);

  return new NextResponse(icon, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
