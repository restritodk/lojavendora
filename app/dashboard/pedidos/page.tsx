import Link from "next/link";
import { OrderStatus } from "@/app/generated/prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { expireApprovedReturnRequests, expirePendingOrders } from "@/lib/orders/payment-lifecycle";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";
import { OrderListTable, type OrderFilter } from "./order-list-table";

const PAGE_SIZE = 15;

const filters = [
  { id: "todos", label: "Listar Todos" },
  { id: "novos", label: "Novos Pedidos" },
  { id: "aguardando-pagamento", label: "Aguardando Pagamento" },
  { id: "aguardando-envio", label: "Aguardando Envio" },
  { id: "cancelamento-solicitado", label: "Cancelamento Solicitado" },
  { id: "cancelados", label: "Cancelados" },
  { id: "transito", label: "Pedidos em Trânsito" },
  { id: "entregues", label: "Pedido Entregue" },
  { id: "devolucoes", label: "Devoluções" },
  { id: "analise", label: "Analisando Pagamento" },
] as const satisfies ReadonlyArray<OrderFilter>;

type OrderFilterId = (typeof filters)[number]["id"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    filtro?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const params = await searchParams;
  const activeFilter = normalizeFilter(params.filtro);
  const search = params.q?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }
  await requireStorePermission(user.id, store.id, "pedidos");
  await expirePendingOrders(store.id);
  await expireApprovedReturnRequests(store.id);

  const where = {
    storeId: store.id,
    OR: [
      { status: { not: OrderStatus.PENDING } },
      { paymentMethod: { in: ["pix-deposito", "customizado", "dinheiro", "manual"] } },
      { paymentStatus: "processando" },
      { paymentStatus: "pago" },
    ],
    ...filterWhere(activeFilter),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            { customer: { name: { contains: search, mode: "insensitive" as const } } },
            { customer: { email: { contains: search, mode: "insensitive" as const } } },
            { recipientName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [orders, totalOrders, advancedSettings] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: { items: true },
        },
        returnRequests: {
          orderBy: { createdAt: "desc" },
          include: {
            attachments: true,
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        cancellations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.order.count({ where }),
    getStoreAdvancedSettings(store.id),
  ]);
  const totalPages = Math.max(Math.ceil(totalOrders / PAGE_SIZE), 1);
  const shippingMethods = getActiveShippingMethods(advancedSettings);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Listagem de Pedidos</span>
      </div>

      <OrderListTable
        orders={orders.map((order) => ({
          id: order.id,
          number: order.number.replace(/^#/, ""),
          customerName: order.customer?.name ?? order.recipientName ?? "Cliente não informado",
          customerEmail: order.customer?.email ?? "E-mail não informado",
          createdAt: order.createdAt.toISOString(),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          total: Number(order.total),
          itemsCount: order._count.items,
          integrationStatus: normalizeOrderJson(order.integrationStatus),
          shippingMethod: order.shippingMethod,
          shippingZipCode: order.shippingZipCode,
          shippingStreet: order.shippingStreet,
          shippingNumber: order.shippingNumber,
          shippingNeighborhood: order.shippingNeighborhood,
          shippingCity: order.shippingCity,
          shippingState: order.shippingState,
          returnRequests: order.returnRequests.map((request) => ({
            id: request.id,
            status: request.status,
            reason: request.reason,
            otherReason: request.otherReason,
            observation: request.observation,
            merchantCarrier: request.merchantCarrier,
            merchantPostCode: request.merchantPostCode,
            merchantReturnAddress: request.merchantReturnAddress,
            merchantPostDeadline: request.merchantPostDeadline,
            merchantPackageInstructions: request.merchantPackageInstructions,
            merchantNotes: request.merchantNotes,
            customerTrackingCode: request.customerTrackingCode,
            customerReturnNote: request.customerReturnNote,
            refundStatus: request.refundStatus,
            refundMessage: request.refundMessage,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
            customerName: request.customer?.name ?? order.customer?.name ?? "Cliente",
            customerEmail: request.customer?.email ?? order.customer?.email ?? "E-mail não informado",
            attachments: request.attachments.map((attachment) => ({
              id: attachment.id,
              url: attachment.url,
              type: attachment.type,
              fileName: attachment.fileName,
              purpose: attachment.purpose,
            })),
          })),
          cancellation: order.cancellations[0]
            ? {
                reason: order.cancellations[0].reason,
                otherReason: order.cancellations[0].otherReason,
                actorType: order.cancellations[0].actorType,
                refundStatus: order.cancellations[0].refundStatus,
                refundMessage: order.cancellations[0].refundMessage,
                createdAt: order.cancellations[0].createdAt.toISOString(),
              }
            : null,
        }))}
        shippingMethods={shippingMethods}
        filters={filters}
        activeFilter={activeFilter}
        search={search}
        selectedCountLabel={`(${orders.length})`}
        currentPage={currentPage}
        totalPages={totalPages}
        totalOrders={totalOrders}
      />
    </DashboardShell>
  );
}

function normalizeOrderJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getActiveShippingMethods(
  settings: Awaited<ReturnType<typeof getStoreAdvancedSettings>>,
) {
  const methods = Object.entries(settings)
    .filter(([featureId, setting]) => featureId.startsWith("shipping:") && setting.active)
    .map(([featureId, setting]) => ({
      id: featureId.replace("shipping:", ""),
      name: getSettingValue(setting.values.name, getShippingLabel(featureId.replace("shipping:", ""))),
    }));

  if (methods.length > 0) {
    return methods;
  }

  return [
    { id: "correios", name: "Correios" },
    { id: "jadlog", name: "Jadlog" },
    { id: "melhor-envio", name: "Melhor Envio" },
    { id: "motoboy", name: "Motoboy / Entrega local" },
    { id: "retirada", name: "Retirada na loja" },
  ];
}

function getSettingValue(value: string | string[] | undefined, fallback: string) {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function getShippingLabel(id: string) {
  const labels: Record<string, string> = {
    correios: "Correios",
    jadlog: "Jadlog",
    "melhor-envio": "Melhor Envio",
    motoboy: "Motoboy / Entrega local",
    retirada: "Retirada na loja",
  };

  return labels[id] ?? id;
}

function normalizeFilter(filter?: string): OrderFilterId {
  return filters.some((item) => item.id === filter)
    ? (filter as OrderFilterId)
    : "todos";
}

function filterWhere(filter: OrderFilterId) {
  switch (filter) {
    case "todos":
      return { status: { not: OrderStatus.DELIVERED } };
    case "novos":
      return {
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
      };
    case "aguardando-pagamento":
      return {
        status: OrderStatus.PENDING,
        paymentStatus: { notIn: ["processando", "cancelado"] },
      };
    case "aguardando-envio":
      return { status: OrderStatus.PAID };
    case "cancelamento-solicitado":
      return { paymentStatus: "cancelado" };
    case "cancelados":
      return { status: OrderStatus.CANCELED };
    case "transito":
      return { status: OrderStatus.SHIPPED };
    case "entregues":
      return { status: OrderStatus.DELIVERED };
    case "devolucoes":
      return {
        returnRequests: {
          some: {
            status: { notIn: ["REJECTED", "REFUNDED"] },
          },
        },
      };
    case "analise":
      return {
        OR: [
          { paymentStatus: "processando" },
          { status: OrderStatus.PROCESSING },
        ],
      };
    default:
      return { status: { not: OrderStatus.DELIVERED } };
  }
}
