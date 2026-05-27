import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { EditOrderForm } from "./edit-order-form";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const customerName = order.customer?.name ?? order.recipientName ?? "Cliente não informado";
  const shippingAddress = [
    order.shippingStreet,
    order.shippingNumber,
    order.shippingNeighborhood,
    order.shippingCity,
    order.shippingState,
    order.shippingZipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <Link href="/dashboard/pedidos" className="transition hover:text-[#17293f]">
          Listagem de Pedidos
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Editar Pedido - {order.number}</span>
      </div>

      <EditOrderForm
        order={{
          id: order.id,
          number: order.number,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          subtotal: Number(order.subtotal),
          shippingFee: Number(order.shippingFee),
          discount: Number(order.discount),
          total: Number(order.total),
          shippingMethod: order.shippingMethod,
          trackingCode: order.trackingCode,
          shippingDeadline: order.shippingDeadline,
          shippingAddress: shippingAddress || "Endereço não informado",
          recipientName: order.recipientName ?? customerName,
          notes: order.notes,
          createdAt: order.createdAt.toISOString(),
          customer: {
            name: customerName,
            email: order.customer?.email ?? "E-mail não informado",
            phone: order.customer?.phone ?? "",
            document: order.customer?.document ?? "",
          },
          items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
          })),
        }}
      />
    </DashboardShell>
  );
}
