import { OrderStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  STORE_REGISTRATION_FEATURE_ID,
  normalizeStoreRegistrationValues,
} from "@/lib/store-registration";

export type ReportSearchParams = {
  start?: string;
  end?: string;
};

export type ReportRow = {
  label: string;
  value: string;
};

export type ReportPeriod = ReturnType<typeof getReportPeriod>;

export type ReportData = Awaited<ReturnType<typeof getReportData>>;

export async function getReportData({
  storeId,
  storeName,
  storeLogoUrl,
  userEmail,
  params,
}: {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  userEmail: string;
  params: ReportSearchParams;
}) {
  const period = getReportPeriod(params);
  const [setting, orders, productsCount, customersCount] = await Promise.all([
    prisma.storeAdvancedSetting.findUnique({
      where: {
        storeId_featureId: {
          storeId,
          featureId: STORE_REGISTRATION_FEATURE_ID,
        },
      },
      select: { values: true },
    }),
    prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                customCode: true,
                costPrice: true,
              },
            },
          },
        },
      },
    }),
    prisma.product.count({ where: { storeId } }),
    prisma.customer.count({ where: { storeId } }),
  ]);

  const registration = normalizeStoreRegistrationValues(setting?.values);
  const report = buildReport({
    orders,
    productsCount,
    customersCount,
    daysInPeriod: period.days,
  });
  const storeAddress = formatAddress(registration);
  const ownerRows: ReportRow[] = [
    { label: "Tipo de pessoa", value: registration.personType === "JURIDICA" ? "Jurídica" : "Física" },
    { label: "Nome/Razão social", value: registration.companyName || registration.fullName || storeName },
    { label: "Representante", value: registration.representative || "Não informado" },
    { label: "Documento", value: registration.document || "Não informado" },
    { label: "Telefone", value: registration.phone || "Não informado" },
    { label: "WhatsApp", value: registration.whatsapp || "Não informado" },
    { label: "E-mail de cadastro", value: registration.email || userEmail },
    { label: "Ramo", value: registration.businessSegment || "Não informado" },
  ];

  return {
    period,
    registration,
    report,
    storeAddress,
    ownerRows,
    logoUrl: getValidLogoUrl(registration.logoUrl) || getValidLogoUrl(storeLogoUrl) || null,
  };
}

function getValidLogoUrl(value: string | null) {
  if (!value || value.startsWith("blob:") || value.startsWith("data:")) {
    return "";
  }

  return value;
}

export function getReportPeriod(params: ReportSearchParams) {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - 30);
  const startDate = parseDateInput(params.start, defaultStart, "start");
  const endDate = parseDateInput(params.end, now, "end");

  return {
    startDate,
    endDate,
    startInput: toDateInput(startDate),
    endInput: toDateInput(endDate),
    days: Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)),
  };
}

export function formatAddress(values: ReturnType<typeof normalizeStoreRegistrationValues>) {
  return [
    values.street,
    values.number,
    values.complement,
    values.neighborhood,
    values.city,
    values.state,
    values.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function parseDateInput(value: string | undefined, fallback: Date, boundary: "start" | "end") {
  const date = value ? new Date(`${value}T00:00:00`) : new Date(fallback);

  if (Number.isNaN(date.getTime())) {
    return parseDateInput(undefined, fallback, boundary);
  }

  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildReport({
  orders,
  productsCount,
  customersCount,
  daysInPeriod,
}: {
  orders: Array<{
    id: string;
    number: string;
    status: OrderStatus;
    total: unknown;
    shippingFee: unknown;
    paymentMethod: string | null;
    shippingMethod: string | null;
    customer: { name: string; email: string | null } | null;
    items: Array<{
      quantity: number;
      total: unknown;
      product: { id: string; name: string; customCode: string | null; costPrice: unknown } | null;
      name: string;
    }>;
  }>;
  productsCount: number;
  customersCount: number;
  daysInPeriod: number;
}) {
  const completedOrders = orders.filter((order) => order.status !== OrderStatus.CANCELED);
  const totalSales = completedOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const totalShipping = completedOrders.reduce((sum, order) => sum + toNumber(order.shippingFee), 0);
  const productMap = new Map<string, {
    code: string;
    name: string;
    orders: Set<string>;
    quantity: number;
    cost: number;
    total: number;
  }>();
  const customerMap = new Map<string, {
    name: string;
    email: string;
    orders: number;
    total: number;
  }>();
  const shippingMap = new Map<string, { name: string; count: number; total: number }>();
  const paymentMap = new Map<string, { name: string; count: number; total: number }>();

  for (const order of completedOrders) {
    const customerKey = order.customer?.email || order.customer?.name || order.number;
    const customer = customerMap.get(customerKey) ?? {
      name: order.customer?.name ?? "Cliente não informado",
      email: order.customer?.email ?? "E-mail não informado",
      orders: 0,
      total: 0,
    };
    customer.orders += 1;
    customer.total += toNumber(order.total);
    customerMap.set(customerKey, customer);

    const shippingName = order.shippingMethod || "Não informado";
    const shipping = shippingMap.get(shippingName) ?? { name: shippingName, count: 0, total: 0 };
    shipping.count += 1;
    shipping.total += toNumber(order.shippingFee);
    shippingMap.set(shippingName, shipping);

    const paymentName = formatPayment(order.paymentMethod);
    const payment = paymentMap.get(paymentName) ?? { name: paymentName, count: 0, total: 0 };
    payment.count += 1;
    payment.total += toNumber(order.total);
    paymentMap.set(paymentName, payment);

    for (const item of order.items) {
      const key = item.product?.id ?? item.name;
      const row = productMap.get(key) ?? {
        code: item.product?.customCode || "-",
        name: item.product?.name || item.name,
        orders: new Set<string>(),
        quantity: 0,
        cost: 0,
        total: 0,
      };
      row.orders.add(order.id);
      row.quantity += item.quantity;
      row.cost += toNumber(item.product?.costPrice) * item.quantity;
      row.total += toNumber(item.total);
      productMap.set(key, row);
    }
  }

  const totalCost = [...productMap.values()].reduce((sum, row) => sum + row.cost, 0);
  return {
    ordersCount: orders.length,
    completedOrdersCount: completedOrders.length,
    productsCount,
    customersCount,
    totalSales,
    totalShipping,
    totalCost,
    totalProfit: totalSales - totalCost - totalShipping,
    averageTicket: completedOrders.length > 0 ? totalSales / completedOrders.length : 0,
    dailyAverage: totalSales / daysInPeriod,
    dailyProfitAverage: (totalSales - totalCost - totalShipping) / daysInPeriod,
    productRows: [...productMap.values()]
      .map((row) => ({ ...row, orders: row.orders.size }))
      .sort((a, b) => b.total - a.total),
    customerRows: [...customerMap.values()]
      .map((row) => ({
        ...row,
        average: row.orders > 0 ? row.total / row.orders : 0,
      }))
      .sort((a, b) => b.total - a.total),
    shippingRows: [...shippingMap.values()].sort((a, b) => b.total - a.total),
    paymentRows: [...paymentMap.values()].sort((a, b) => b.total - a.total),
  };
}

function formatPayment(value: string | null) {
  const labels: Record<string, string> = {
    pix: "Pix",
    "pix-deposito": "Pix / Depósito",
    cartao: "Cartão",
    credit_card: "Cartão de crédito",
    boleto: "Boleto",
    dinheiro: "Dinheiro",
    manual: "Manual",
    customizado: "Pagamento personalizado",
  };

  return value ? labels[value] ?? value : "Não informado";
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value ?? 0);
}
