import { NextRequest } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { getR2Object } from "@/lib/r2-storage";
import { requireStorePermission } from "@/lib/store-permissions";
import {
  formatCurrency,
  formatDate,
  getReportData,
  type ReportData,
  type ReportRow,
} from "../report-data";

export const runtime = "nodejs";

type PdfTable = {
  title: string;
  headers: string[];
  rows: string[][];
};

type ReportExportSection = "all" | "products" | "customers" | "shipping" | "payments";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return new Response("Loja não encontrada.", { status: 404 });
  }

  await requireStorePermission(user.id, store.id, "relatorios");

  const start = request.nextUrl.searchParams.get("start") ?? undefined;
  const end = request.nextUrl.searchParams.get("end") ?? undefined;
  const section = normalizeSection(request.nextUrl.searchParams.get("section"));
  const data = await getReportData({
    storeId: store.id,
    storeName: store.name,
    storeLogoUrl: store.logoUrl,
    userEmail: user.email,
    params: { start, end },
  });
  const pdf = await buildReportsPdf({
    storeName: store.name,
    storeUrl: new URL(`/store/${store.subdomain}`, request.nextUrl.origin).toString(),
    userEmail: user.email,
    data,
    section,
    origin: request.nextUrl.origin,
  });
  const filename = `relatorio-${section}-${data.period.startInput}-${data.period.endInput}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function buildReportsPdf({
  storeName,
  storeUrl,
  userEmail,
  data,
  section,
  origin,
}: {
  storeName: string;
  storeUrl: string;
  userEmail: string;
  data: ReportData;
  section: ReportExportSection;
  origin: string;
}) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    info: {
      Title: `Relatório - ${storeName}`,
      Author: "Vendora",
      Subject: "Relatório da loja",
    },
  });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  await drawHeader(doc, { storeName, storeUrl, userEmail, data, origin });
  drawSectionTitle(doc, "Dados do lojista");
  drawKeyValueGrid(doc, data.ownerRows);
  drawSectionTitle(doc, "Dados da exportação");
  drawKeyValueGrid(doc, [
    { label: "Período", value: `${formatDate(data.period.startDate)} até ${formatDate(data.period.endDate)}` },
    { label: "Gerado em", value: formatDate(new Date()) },
    { label: "Pedidos realizados", value: String(data.report.ordersCount) },
    { label: "Vendas concretizadas", value: String(data.report.completedOrdersCount) },
    { label: "Total em vendas", value: formatCurrency(data.report.totalSales) },
    { label: "Ticket médio", value: formatCurrency(data.report.averageTicket) },
  ]);

  const tables = getReportTables(data);
  const selectedTables = section === "all" ? tables : tables.filter((table) => table.section === section);

  if (section === "all") {
    drawTable(doc, {
      title: "Informações da loja por período",
      headers: ["Indicador", "Valor"],
      rows: [
        ["Clientes cadastrados", String(data.report.customersCount)],
        ["Pedidos realizados", String(data.report.ordersCount)],
        ["Vendas concretizadas", String(data.report.completedOrdersCount)],
        ["Produtos cadastrados", String(data.report.productsCount)],
      ],
    });
    drawTable(doc, {
      title: "Relatórios financeiros por período",
      headers: ["Indicador", "Valor"],
      rows: [
        ["Média de vendas diária", formatCurrency(data.report.dailyAverage)],
        ["Média de lucro diária", formatCurrency(data.report.dailyProfitAverage)],
        ["Total em vendas", formatCurrency(data.report.totalSales)],
        ["Total de custo dos produtos", formatCurrency(data.report.totalCost)],
        ["Total dos valores de frete", formatCurrency(data.report.totalShipping)],
        ["Total de lucro", formatCurrency(data.report.totalProfit)],
      ],
    });
  }

  selectedTables.forEach((table) => drawTable(doc, table));

  doc.end();
  return finished;
}

function getReportTables(data: ReportData): Array<PdfTable & { section: ReportExportSection }> {
  return [
    {
      section: "products",
      title: "Relatório de produtos na data",
      headers: ["Código", "Produto", "Pedidos", "Unid.", "Custo", "Total"],
      rows: data.report.productRows.map((row) => [
        row.code,
        row.name,
        String(row.orders),
        String(row.quantity),
        formatCurrency(row.cost),
        formatCurrency(row.total),
      ]),
    },
    {
      section: "customers",
      title: "Relatório de compras por cliente na data",
      headers: ["Cliente", "E-mail", "Compras", "Total", "Média"],
      rows: data.report.customerRows.map((row) => [
        row.name,
        row.email,
        String(row.orders),
        formatCurrency(row.total),
        formatCurrency(row.average),
      ]),
    },
    {
      section: "shipping",
      title: "Relatório de formas de envio na data",
      headers: ["Forma de envio", "Número total", "Valor total"],
      rows: data.report.shippingRows.map((row) => [
        row.name,
        String(row.count),
        formatCurrency(row.total),
      ]),
    },
    {
      section: "payments",
      title: "Relatório de formas de pagamento na data",
      headers: ["Forma de pagamento", "Número total", "Valor total"],
      rows: data.report.paymentRows.map((row) => [
        row.name,
        String(row.count),
        formatCurrency(row.total),
      ]),
    },
  ];
}

function normalizeSection(value: string | null): ReportExportSection {
  if (value === "products" || value === "customers" || value === "shipping" || value === "payments") {
    return value;
  }

  return "all";
}

async function drawHeader(
  doc: PDFKit.PDFDocument,
  {
    storeName,
    storeUrl,
    userEmail,
    data,
    origin,
  }: {
    storeName: string;
    storeUrl: string;
    userEmail: string;
    data: ReportData;
    origin: string;
  },
) {
  const startY = doc.y;
  const logo = await getImageBuffer(data.logoUrl, origin);

  if (logo) {
    try {
      doc.image(toPngDataUri(logo), 42, startY, { fit: [96, 70], align: "center", valign: "center" });
    } catch (error) {
      console.error("Não foi possível inserir a logo no PDF.", {
        logoUrl: data.logoUrl,
        error,
      });
    }
  }

  const textX = logo ? 156 : 42;
  const textWidth = logo ? 350 : 511;

  doc
    .fontSize(20)
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .text(storeName, textX, startY, { width: textWidth });
  doc
    .moveDown(0.3)
    .fontSize(9)
    .fillColor("#475569")
    .font("Helvetica")
    .text(data.storeAddress || "Endereço não informado", textX, doc.y, { width: textWidth })
    .text(`${data.registration.phone || "Telefone não informado"} | ${data.registration.email || userEmail}`, {
      width: textWidth,
    })
    .fillColor("#0369a1")
    .text(storeUrl, {
      width: textWidth,
      link: storeUrl,
      underline: true,
    });

  doc
    .moveTo(42, Math.max(doc.y + 22, startY + 78))
    .lineTo(553, Math.max(doc.y + 22, startY + 78))
    .strokeColor("#cbd5e1")
    .stroke();
  doc.y = Math.max(doc.y + 34, startY + 98);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 56);
  const titleY = doc.y + 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#0f172a")
    .text(title, 42, titleY, { width: 511, align: "center" });
  doc
    .moveTo(42, doc.y + 10)
    .lineTo(553, doc.y + 10)
    .strokeColor("#e2e8f0")
    .stroke();
  doc.x = 42;
  doc.y += 24;
}

function drawKeyValueGrid(doc: PDFKit.PDFDocument, rows: ReportRow[]) {
  const leftX = 42;
  const rightX = 300;
  const rowHeight = 32;

  rows.forEach((row, index) => {
    ensureSpace(doc, rowHeight);
    const x = index % 2 === 0 ? leftX : rightX;
    const y = index % 2 === 0 ? doc.y : doc.y - rowHeight;

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#64748b")
      .text(row.label.toUpperCase(), x, y, { width: 230 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#0f172a")
      .text(row.value, x, y + 12, { width: 230, lineGap: 1 });

    if (index % 2 === 1 || index === rows.length - 1) {
      doc.y = y + rowHeight;
    }
  });

  doc.moveDown(0.5);
}

function drawTable(doc: PDFKit.PDFDocument, table: PdfTable) {
  drawSectionTitle(doc, table.title);

  if (table.rows.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text("Nenhum dado encontrado no período.");
    doc.moveDown(0.5);
    return;
  }

  const pageWidth = 511;
  const columnWidth = pageWidth / table.headers.length;
  const startX = 42;
  const rowHeight = 26;

  drawTableRow(doc, table.headers, startX, columnWidth, rowHeight, true);

  for (const row of table.rows.slice(0, 80)) {
    ensureSpace(doc, rowHeight + 8);
    drawTableRow(doc, row, startX, columnWidth, rowHeight, false);
  }

  if (table.rows.length > 80) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748b")
      .text(`Mais ${table.rows.length - 80} registros não exibidos no PDF para manter o arquivo legível.`);
  }

  doc.x = 42;
  doc.moveDown(0.7);
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  cells: string[],
  startX: number,
  columnWidth: number,
  rowHeight: number,
  isHeader: boolean,
) {
  const y = doc.y;

  cells.forEach((cell, index) => {
    doc
      .rect(startX + index * columnWidth, y, columnWidth, rowHeight)
      .fillAndStroke(isHeader ? "#f1f5f9" : "#ffffff", "#e2e8f0");
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isHeader ? 8 : 7)
      .fillColor(isHeader ? "#334155" : "#475569")
      .text(cell, startX + index * columnWidth + 5, y + 8, {
        width: columnWidth - 10,
        height: rowHeight - 8,
        ellipsis: true,
      });
  });

  doc.x = 42;
  doc.y = y + rowHeight;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - 42) {
    doc.addPage();
  }
}

function toPngDataUri(image: Buffer) {
  return `data:image/png;base64,${image.toString("base64")}`;
}

async function getImageBuffer(url: string | null, origin: string) {
  if (!url) {
    return null;
  }

  let image: Buffer | null = null;

  if (url.startsWith("/api/r2/")) {
    const key = url.replace("/api/r2/", "").split(/[?#]/)[0];
    const object = await getR2Object(key);
    image = object?.body ?? null;
  }

  if (url.startsWith("/uploads/")) {
    try {
      const relativePath = url.replace(/^\/+/, "").split(/[?#]/)[0];
      image = await readFile(path.join(process.cwd(), "public", relativePath));
    } catch {
      image = null;
    }
  }

  if (!image) {
    try {
      const imageUrl = url.startsWith("/") ? new URL(url, origin).toString() : url;
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return null;
      }

      image = Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  try {
    return await sharp(image).png().toBuffer();
  } catch (error) {
    console.error("Não foi possível converter a logo para PNG.", { url, error });
    return null;
  }
}
