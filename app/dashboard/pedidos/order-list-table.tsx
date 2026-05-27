"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  confirmOrderDeliveryAction,
  confirmOrderShipmentAction,
  deleteOrderAction,
  generateShippingLabelAction,
  approveReturnRequestAction,
  receiveReturnedOrderAction,
  refundReturnedOrderAction,
  rejectReturnRequestAction,
  updateOrderStatusAction,
  type OrderListActionResult,
} from "./actions";

export type OrderFilter = {
  id: string;
  label: string;
};

export type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  status: string;
  total: number;
  itemsCount: number;
  integrationStatus: Record<string, unknown>;
  shippingMethod: string | null;
  shippingZipCode: string | null;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingNeighborhood: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  returnRequests: Array<{
    id: string;
    status: string;
    reason: string;
    otherReason: string | null;
    observation: string | null;
    merchantCarrier: string | null;
    merchantPostCode: string | null;
    merchantReturnAddress: string | null;
    merchantPostDeadline: string | null;
    merchantPackageInstructions: string | null;
    merchantNotes: string | null;
    customerTrackingCode: string | null;
    customerReturnNote: string | null;
    refundStatus: string | null;
    refundMessage: string | null;
    createdAt: string;
    updatedAt: string;
    customerName: string;
    customerEmail: string;
    attachments: Array<{
      id: string;
      url: string;
      type: string;
      fileName: string | null;
      purpose: string;
    }>;
  }>;
  cancellation: {
    reason: string;
    otherReason: string | null;
    actorType: string;
    refundStatus: string | null;
    refundMessage: string | null;
    createdAt: string;
  } | null;
};

type OrderListTableProps = {
  orders: OrderRow[];
  filters: ReadonlyArray<OrderFilter>;
  activeFilter: string;
  search: string;
  selectedCountLabel: string;
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  shippingMethods: Array<{ id: string; name: string }>;
};

export function OrderListTable({
  orders,
  filters,
  activeFilter,
  search,
  selectedCountLabel,
  currentPage,
  totalPages,
  totalOrders,
  shippingMethods,
}: OrderListTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openMenu, setOpenMenu] = useState<{
    orderId: string;
    status: string;
    paymentMethod: string | null;
    hasProof: boolean;
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const [feedback, setFeedback] = useState<OrderListActionResult | null>(null);
  const [shipmentOrder, setShipmentOrder] = useState<OrderRow | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<OrderRow | null>(null);
  const [proofOrder, setProofOrder] = useState<OrderRow | null>(null);
  const [labelOrder, setLabelOrder] = useState<OrderRow | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<OrderRow | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderRow | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<OrderRow | null>(null);
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  const [approveReturn, setApproveReturn] = useState<OrderRow | null>(null);
  const [rejectReturn, setRejectReturn] = useState<OrderRow | null>(null);
  const [receiveReturn, setReceiveReturn] = useState<OrderRow | null>(null);
  const [refundReturn, setRefundReturn] = useState<OrderRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function createHref(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    return `/dashboard/pedidos?${params.toString()}`;
  }

  function confirmPayment(orderId: string) {
    startTransition(() => {
      void updateOrderStatusAction(orderId, "paid").then((result) => {
        setFeedback(result);
        setPaymentOrder(null);
        router.refresh();
      });
    });
  }

  function handleSearch(formData: FormData) {
    const value = String(formData.get("q") ?? "").trim();
    router.push(createHref({ q: value || null, page: null }));
  }

  function runOrderAction(
    orderId: string,
    action: "paid" | "shipped" | "delivered" | "canceled",
  ) {
    setOpenMenu(null);

    startTransition(() => {
      void updateOrderStatusAction(orderId, action).then((result) => {
        setFeedback(result);
        router.refresh();
      });
    });
  }

  function generateLabel(formData: FormData) {
    if (!labelOrder) return;

    startTransition(() => {
      void generateShippingLabelAction(labelOrder.id, formData).then((result) => {
        setFeedback(result);
        setLabelOrder(null);
        router.refresh();
      });
    });
  }

  function confirmDelivery(formData: FormData) {
    if (!deliveryOrder) return;

    startTransition(() => {
      void confirmOrderDeliveryAction(deliveryOrder.id, formData).then((result) => {
        setFeedback(result);
        setDeliveryOrder(null);
        router.refresh();
      });
    });
  }

  function confirmDeleteOrder() {
    if (!deleteOrder) return;

    startTransition(() => {
      void deleteOrderAction(deleteOrder.id).then((result) => {
        setFeedback(result);
        setDeleteOrder(null);
        router.refresh();
      });
    });
  }

  function confirmShipment(formData: FormData) {
    if (!shipmentOrder) return;

    startTransition(() => {
      void confirmOrderShipmentAction(shipmentOrder.id, formData).then((result) => {
        setFeedback(result);
        setShipmentOrder(null);
        router.refresh();
      });
    });
  }

  function approveReturnRequest(formData: FormData) {
    const request = approveReturn?.returnRequests[0];
    if (!request) return;

    startTransition(() => {
      void approveReturnRequestAction(request.id, formData).then((result) => {
        setFeedback(result);
        setApproveReturn(null);
        router.refresh();
      });
    });
  }

  function rejectReturnRequest(formData: FormData) {
    const request = rejectReturn?.returnRequests[0];
    if (!request) return;

    startTransition(() => {
      void rejectReturnRequestAction(request.id, formData).then((result) => {
        setFeedback(result);
        setRejectReturn(null);
        router.refresh();
      });
    });
  }

  function receiveReturnedOrder(formData: FormData) {
    const request = receiveReturn?.returnRequests[0];
    if (!request) return;

    startTransition(() => {
      void receiveReturnedOrderAction(request.id, formData).then((result) => {
        setFeedback(result);
        setReceiveReturn(null);
        router.refresh();
      });
    });
  }

  function refundReturnedOrder() {
    const request = refundReturn?.returnRequests[0];
    if (!request) return;

    startTransition(() => {
      void refundReturnedOrderAction(request.id).then((result) => {
        setFeedback(result);
        setRefundReturn(null);
        router.refresh();
      });
    });
  }

  return (
    <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#dddddd] px-4 py-3">
        <h1 className="font-bold text-slate-700">Listagem de Pedidos</h1>
        <div className="flex flex-wrap gap-2">
          <button className="rounded bg-slate-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-slate-600">
            ↪ Exportar Pedidos
          </button>
          <Link
            href="/dashboard/pedidos/novo"
            className="rounded bg-sky-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-sky-700"
          >
            + Adicionar Pedido
          </Link>
        </div>
      </header>

      <div className="border-b border-slate-200 px-4">
        <div className="flex gap-5 overflow-x-auto text-xs font-bold text-slate-500">
          {filters.map((filter) => (
            <Link
              key={filter.id}
              href={createHref({ filtro: filter.id === "todos" ? null : filter.id, page: null })}
              className={`shrink-0 border-b-2 py-4 transition ${
                activeFilter === filter.id
                  ? "border-cyan-600 text-cyan-700"
                  : "border-transparent hover:text-cyan-700"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      {orders.length > 0 ? (
        <>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center">
            <select className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-500 lg:w-52">
              <option>{selectedCountLabel} Com selecionados...</option>
            </select>
            <form action={handleSearch} className="relative w-full max-w-xs">
              <input
                name="q"
                defaultValue={search}
                placeholder="O que você procura?"
                className="h-10 w-full rounded border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-cyan-600"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-xs">
              <thead className="bg-white text-left text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-4">
                    <input type="checkbox" className="accent-cyan-700" />
                  </th>
                  <TableHead>Código ↕</TableHead>
                  <TableHead>Nome ↕</TableHead>
                  <TableHead>E-mail ↕</TableHead>
                  <TableHead>Data Pedido ↕</TableHead>
                  <TableHead>Forma de Pagamento ↕</TableHead>
                  <TableHead>Situação ↕</TableHead>
                  <TableHead>Sub-Status ↕</TableHead>
                  <TableHead>Valor Total ↕</TableHead>
                  <th className="w-12 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 bg-sky-50/70 text-slate-600"
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="accent-cyan-700" />
                    </td>
                    <td className="px-4 py-3 font-bold text-cyan-700">{order.number}</td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">{order.customerEmail}</td>
                    <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">{formatPayment(order.paymentMethod)}</td>
                    <td className="px-4 py-3">{formatStatus(order.status, order)}</td>
                    <td className="px-4 py-3">{formatSubStatus(order.paymentStatus, order)}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(order.total)}</td>
                    <td className="relative px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          const menuWidth = 210;
                          const menuHeight = 420;
                          const viewportPadding = 12;
                          const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
                          const opensUp = spaceBelow < menuHeight && rect.top > spaceBelow;
                          const availableHeight = opensUp
                            ? rect.top - viewportPadding
                            : spaceBelow;

                          setOpenMenu((current) =>
                            current?.orderId === order.id
                              ? null
                              : {
                                  orderId: order.id,
                                  status: order.status,
                                  paymentMethod: order.paymentMethod,
                                  hasProof: Boolean(getPaymentProof(order.integrationStatus)),
                                  top: opensUp
                                    ? Math.max(viewportPadding, rect.top - Math.min(menuHeight, availableHeight) - 6)
                                    : rect.bottom + 6,
                                  left: Math.min(
                                    Math.max(rect.right - menuWidth, viewportPadding),
                                    window.innerWidth - menuWidth - viewportPadding,
                                  ),
                                  maxHeight: Math.max(180, Math.min(menuHeight, availableHeight)),
                                },
                          );
                        }}
                        className="grid size-8 place-items-center rounded border border-cyan-300 bg-white text-cyan-700 shadow-sm"
                        aria-label={`Abrir ações do pedido ${order.number}`}
                      >
                        ⚙
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center">
            <span>
              Mostrando {orders.length} de {totalOrders} pedido(s)
            </span>
            <div className="flex gap-2">
              <Link
                href={createHref({
                  page: String(Math.max(currentPage - 1, 1)),
                })}
                className={`rounded border px-4 py-2 font-bold ${
                  currentPage <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Anterior
              </Link>
              <Link
                href={createHref({
                  page: String(Math.min(currentPage + 1, totalPages)),
                })}
                className={`rounded border px-4 py-2 font-bold ${
                  currentPage >= totalPages
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Próxima
              </Link>
            </div>
          </footer>
        </>
      ) : (
        <EmptyOrders />
      )}
      {openMenu ? (
        <OrderActionMenu
          orderId={openMenu.orderId}
          status={openMenu.status}
          paymentMethod={openMenu.paymentMethod}
          hasProof={openMenu.hasProof}
          top={openMenu.top}
          left={openMenu.left}
          maxHeight={openMenu.maxHeight}
          isPending={isPending}
          onClose={() => setOpenMenu(null)}
          onAction={runOrderAction}
          onShipment={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setShipmentOrder(order ?? null);
          }}
          onPayment={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setPaymentOrder(order ?? null);
          }}
          onProof={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setProofOrder(order ?? null);
          }}
          onLabel={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setLabelOrder(order ?? null);
          }}
          onDelivery={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setDeliveryOrder(order ?? null);
          }}
          onCancel={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setCancelOrder(order ?? null);
          }}
          onDelete={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setDeleteOrder(order ?? null);
          }}
          onReturn={() => {
            const order = orders.find((item) => item.id === openMenu.orderId);
            setOpenMenu(null);
            setReturnOrder(order ?? null);
          }}
        />
      ) : null}
      {paymentOrder ? (
        <PaymentReviewModal
          order={paymentOrder}
          isPending={isPending}
          onClose={() => setPaymentOrder(null)}
          onConfirm={() => confirmPayment(paymentOrder.id)}
        />
      ) : null}
      {proofOrder ? (
        <PaymentProofReviewModal
          order={proofOrder}
          onClose={() => setProofOrder(null)}
        />
      ) : null}
      {shipmentOrder ? (
        <TrackingCodeModal
          order={shipmentOrder}
          shippingMethods={shippingMethods}
          isPending={isPending}
          onClose={() => setShipmentOrder(null)}
          onSubmit={confirmShipment}
        />
      ) : null}
      {labelOrder ? (
        <ShippingLabelModal
          order={labelOrder}
          shippingMethods={shippingMethods}
          isPending={isPending}
          onClose={() => setLabelOrder(null)}
          onSubmit={generateLabel}
        />
      ) : null}
      {deliveryOrder ? (
        <DeliveryConfirmationModal
          order={deliveryOrder}
          isPending={isPending}
          onClose={() => setDeliveryOrder(null)}
          onSubmit={confirmDelivery}
        />
      ) : null}
      {cancelOrder ? (
        <ConfirmOrderDialog
          order={cancelOrder}
          title="Cancelar pedido?"
          message="O pedido será marcado como cancelado. Essa ação não confirma estorno automático e deve ser usada apenas quando a loja realmente quiser cancelar o pedido."
          confirmLabel="Sim, cancelar"
          tone="danger"
          isPending={isPending}
          onClose={() => setCancelOrder(null)}
          onConfirm={() => {
            runOrderAction(cancelOrder.id, "canceled");
            setCancelOrder(null);
          }}
        />
      ) : null}
      {deleteOrder ? (
        <ConfirmOrderDialog
          order={deleteOrder}
          title="Excluir pedido?"
          message="Essa ação remove o pedido da base. Por segurança, apenas pedidos cancelados podem ser excluídos."
          confirmLabel="Sim, excluir"
          tone="danger"
          isPending={isPending}
          onClose={() => setDeleteOrder(null)}
          onConfirm={confirmDeleteOrder}
        />
      ) : null}
      {returnOrder ? (
        <ReturnRequestModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onApprove={() => {
            setApproveReturn(returnOrder);
            setReturnOrder(null);
          }}
          onReject={() => {
            setRejectReturn(returnOrder);
            setReturnOrder(null);
          }}
          onReceive={() => {
            setReceiveReturn(returnOrder);
            setReturnOrder(null);
          }}
          onRefund={() => {
            setRefundReturn(returnOrder);
            setReturnOrder(null);
          }}
        />
      ) : null}
      {approveReturn ? (
        <ApproveReturnModal
          order={approveReturn}
          isPending={isPending}
          onClose={() => setApproveReturn(null)}
          onSubmit={approveReturnRequest}
        />
      ) : null}
      {rejectReturn ? (
        <RejectReturnModal
          isPending={isPending}
          onClose={() => setRejectReturn(null)}
          onSubmit={rejectReturnRequest}
        />
      ) : null}
      {receiveReturn ? (
        <SimpleFormModal
          title="Validar recebimento"
          description="Confirme que o produto retornou e está validado para estorno."
          isPending={isPending}
          onClose={() => setReceiveReturn(null)}
          onSubmit={receiveReturnedOrder}
          submitLabel="Validar recebimento"
          fieldLabel="Observação"
          optional
        />
      ) : null}
      {refundReturn ? (
        <ConfirmOrderDialog
          order={refundReturn}
          title="Estornar pedido?"
          message="O sistema tentará estornar o pagamento no Mercado Pago usando o pagamento original do pedido."
          confirmLabel="Solicitar estorno"
          tone="danger"
          isPending={isPending}
          onClose={() => setRefundReturn(null)}
          onConfirm={refundReturnedOrder}
        />
      ) : null}
      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Pedido atualizado com sucesso!"
          errorTitle="Não foi possível atualizar o pedido"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </section>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-4 font-bold">{children}</th>;
}

function EmptyOrders() {
  return (
    <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
      <div>
        <div className="mx-auto grid size-28 place-items-center rounded-full bg-slate-50 text-6xl">
          📋
        </div>
        <h2 className="mt-4 text-lg font-black text-slate-700">
          Nenhum Item Encontrado!
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Ops! Você não possui nenhum item cadastrado.
        </p>
        <Link
          href="/dashboard/pedidos/novo"
          className="text-sm font-bold text-cyan-700 underline"
        >
          Clique aqui
        </Link>{" "}
        <span className="text-sm text-slate-500">para inserir conteúdo na listagem.</span>
      </div>
    </div>
  );
}

function ReturnRequestModal({
  order,
  onClose,
  onApprove,
  onReject,
  onReceive,
  onRefund,
}: {
  order: OrderRow;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReceive: () => void;
  onRefund: () => void;
}) {
  const request = order.returnRequests[0];
  const [expandedAttachment, setExpandedAttachment] = useState<
    OrderRow["returnRequests"][number]["attachments"][number] | null
  >(null);

  if (!request) {
    return (
      <InfoModal title="Devolução" onClose={onClose}>
        <p className="p-5 text-sm font-semibold text-slate-600">Este pedido ainda não possui solicitação de devolução.</p>
      </InfoModal>
    );
  }

  return (
    <InfoModal title={`Devolução do pedido ${order.number}`} onClose={onClose}>
      <div className="grid gap-4 p-5 text-sm">
        <div className="rounded-2xl bg-slate-50 p-4">
          <strong className="block text-slate-950">{request.customerName}</strong>
          <span className="text-slate-500">{request.customerEmail}</span>
          <span className="mt-2 block font-bold text-amber-700">Status: {formatReturnStatus(request.status)}</span>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <strong className="block text-slate-950">Motivo</strong>
          <span className="mt-2 block text-slate-600">{request.otherReason || request.reason}</span>
          {request.observation ? <span className="mt-2 block text-slate-500">{request.observation}</span> : null}
        </div>
        {request.attachments.length > 0 ? (
          <div className="rounded-2xl border border-slate-100 p-4">
            <strong className="block text-slate-950">Anexos</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {request.attachments.map((attachment) => (
                <div key={attachment.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  {attachment.type === "image" ? (
                    <button
                      type="button"
                      onClick={() => setExpandedAttachment(attachment)}
                      className="group relative block w-full overflow-hidden bg-slate-100 text-left"
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.fileName || "Anexo da devolução"}
                        width={420}
                        height={260}
                        unoptimized
                        className="h-44 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                      <span className="absolute inset-x-3 bottom-3 rounded-full bg-slate-950/75 px-3 py-2 text-center text-[11px] font-black text-white opacity-0 transition group-hover:opacity-100">
                        Clique para ampliar
                      </span>
                    </button>
                  ) : attachment.type === "video" ? (
                    <video src={attachment.url} controls className="h-44 w-full bg-slate-950 object-contain" />
                  ) : (
                    <div className="grid h-32 place-items-center text-xs font-black text-slate-500">
                      Arquivo anexado
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 p-3">
                    <span className="min-w-0">
                      <strong className="block truncate text-xs text-slate-700">{attachment.fileName || attachment.type}</strong>
                      <span className="text-[11px] font-bold uppercase text-slate-400">{attachment.purpose}</span>
                    </span>
                    <a
                      href={attachment.url}
                      download={attachment.fileName || true}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-cyan-700 px-3 py-2 text-[11px] font-black text-white"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {request.customerTrackingCode || request.customerReturnNote ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
            <strong className="block">Postagem do comprador</strong>
            {request.customerTrackingCode ? <span className="mt-2 block">Rastreio: {request.customerTrackingCode}</span> : null}
            {request.customerReturnNote ? <span className="mt-1 block">Observação: {request.customerReturnNote}</span> : null}
          </div>
        ) : null}
        {request.refundMessage ? (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-900">
            <strong className="block">Estorno</strong>
            <span className="mt-2 block">{formatRefundStatus(request.refundStatus)}: {request.refundMessage}</span>
          </div>
        ) : null}
        {expandedAttachment ? (
          <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-5 backdrop-blur-sm">
            <div className="w-fit max-w-[94vw] overflow-hidden rounded-2xl bg-white shadow-2xl">
              <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
                <strong className="min-w-0 truncate text-sm text-slate-800">
                  {expandedAttachment.fileName || "Anexo da devolução"}
                </strong>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={expandedAttachment.url}
                    download={expandedAttachment.fileName || true}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                  >
                    Baixar
                  </a>
                  <button
                    type="button"
                    onClick={() => setExpandedAttachment(null)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                  >
                    Fechar
                  </button>
                </div>
              </header>
              <div className="grid max-h-[78vh] max-w-[94vw] place-items-center bg-slate-50 p-4">
                <Image
                  src={expandedAttachment.url}
                  alt={expandedAttachment.fileName || "Anexo ampliado da devolução"}
                  width={980}
                  height={760}
                  unoptimized
                  className="h-auto max-h-[72vh] w-auto max-w-[88vw] rounded-xl object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onReject} disabled={request.status !== "REQUESTED"} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black text-red-600 disabled:opacity-40">Recusar</button>
          <button type="button" onClick={onApprove} disabled={request.status !== "REQUESTED"} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Aprovar devolução</button>
          <button type="button" onClick={onReceive} disabled={request.status !== "SHIPPED_BY_CUSTOMER"} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Validar recebimento</button>
          <button type="button" onClick={onRefund} disabled={request.status !== "RECEIVED_BY_MERCHANT"} className="rounded-full bg-cyan-700 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Estornar</button>
        </div>
      </div>
    </InfoModal>
  );
}

function ApproveReturnModal({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: OrderRow;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <InfoModal title={`Aprovar devolução ${order.number}`} onClose={onClose}>
      <form action={onSubmit} className="grid gap-4 p-5">
        <InputLike name="carrier" label="Transportadora / Correios" />
        <InputLike name="postCode" label="Código de postagem reversa" />
        <InputLike name="deadline" label="Prazo para postagem" placeholder="Ex: até 7 dias corridos" />
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Endereço de devolução
          <textarea name="returnAddress" required className="min-h-24 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Instruções para embalagem/postagem
          <textarea name="instructions" required className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Observações internas ou para cliente
          <textarea name="notes" className="min-h-20 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" />
        </label>
        <ModalFooter isPending={isPending} onClose={onClose} submitLabel="Aprovar devolução" />
      </form>
    </InfoModal>
  );
}

function RejectReturnModal({
  isPending,
  onClose,
  onSubmit,
}: {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [reason, setReason] = useState("Produto fora do prazo de devolução");

  return (
    <InfoModal title="Recusar devolução" onClose={onClose}>
      <form action={onSubmit} className="grid gap-4 p-5">
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          Informe o motivo da recusa. O comprador verá essa informação no painel dele.
        </p>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Motivo da recusa
          <select
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
          >
            <option>Produto fora do prazo de devolução</option>
            <option>Produto com indícios de uso indevido</option>
            <option>Produto não corresponde ao pedido devolvido</option>
            <option>Faltam fotos ou informações para análise</option>
            <option>Solicitação não atende à política da loja</option>
            <option>Outro motivo</option>
          </select>
        </label>
        {reason === "Outro motivo" ? (
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Descreva o motivo
            <textarea name="otherReason" required className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" />
          </label>
        ) : null}
        <ModalFooter isPending={isPending} onClose={onClose} submitLabel="Recusar devolução" />
      </form>
    </InfoModal>
  );
}

function SimpleFormModal({
  title,
  description,
  fieldLabel,
  submitLabel,
  optional = false,
  isPending,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  fieldLabel: string;
  submitLabel: string;
  optional?: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <InfoModal title={title} onClose={onClose}>
      <form action={onSubmit} className="grid gap-4 p-5">
        <p className="text-sm font-semibold text-slate-500">{description}</p>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          {fieldLabel}
          <textarea name="notes" required={!optional} className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" />
        </label>
        <ModalFooter isPending={isPending} onClose={onClose} submitLabel={submitLabel} />
      </form>
    </InfoModal>
  );
}

function InfoModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" onClick={onClose} className="text-2xl font-black">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  isPending,
  onClose,
  submitLabel,
}: {
  isPending: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600">Cancelar</button>
      <button disabled={isPending} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
        {isPending ? "Salvando..." : submitLabel}
      </button>
    </footer>
  );
}

function InputLike({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input name={name} placeholder={placeholder} className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold" />
    </label>
  );
}

function formatReturnStatus(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: "Solicitada",
    APPROVED: "Aprovada",
    REJECTED: "Recusada",
    SHIPPED_BY_CUSTOMER: "Postada pelo comprador",
    RECEIVED_BY_MERCHANT: "Recebida pela loja",
    REFUNDED: "Estornada",
  };

  return labels[status] ?? status;
}

function formatRefundStatus(status: string | null) {
  const labels: Record<string, string> = {
    refunded: "Estornado",
    requested: "Estorno solicitado",
    failed: "Falha no estorno",
  };

  return status ? labels[status] ?? status : "Estorno";
}

function OrderActionMenu({
  orderId,
  status,
  paymentMethod,
  hasProof,
  top,
  left,
  maxHeight,
  isPending,
  onClose,
  onAction,
  onShipment,
  onPayment,
  onProof,
  onLabel,
  onDelivery,
  onCancel,
  onDelete,
  onReturn,
}: {
  orderId: string;
  status: string;
  paymentMethod: string | null;
  hasProof: boolean;
  top: number;
  left: number;
  maxHeight: number;
  isPending: boolean;
  onClose: () => void;
  onAction: (
    orderId: string,
    action: "paid" | "shipped" | "delivered" | "canceled",
  ) => void;
  onShipment: () => void;
  onPayment: () => void;
  onProof: () => void;
  onLabel: () => void;
  onDelivery: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onReturn: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const canManuallyConfirmPayment = ["customizado", "pix-deposito", "dinheiro", "manual"].includes(paymentMethod ?? "");

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const items: Array<{
    label: string;
    icon: string;
    href?: string;
    action?: "paid" | "shipped" | "delivered" | "canceled" | "proof" | "label" | "delivery" | "delete" | "return";
    disabled?: boolean;
  }> = [
    { label: "Editar", icon: "✎", href: `/dashboard/pedidos/${orderId}/editar` },
    { label: "Emitir NF-e", icon: "▣" },
    {
      label: "Confirmar pagamento",
      icon: "✓",
      action: "paid",
      disabled: status !== "PENDING" || !canManuallyConfirmPayment,
    },
    {
      label: "Analisar comprovante",
      icon: "◉",
      action: "proof",
      disabled: !hasProof,
    },
    { label: "Confirmar envio", icon: "↗", action: "shipped", disabled: status !== "PAID" },
    { label: "Concluir pedido", icon: "★", action: "delivered", disabled: status !== "SHIPPED" },
    { label: "Confirmar entrega", icon: "✓", action: "delivery", disabled: status !== "SHIPPED" },
    { label: "Ver devolução", icon: "↩", action: "return" },
    { label: "Gerar etiqueta", icon: "⌁", action: "label", disabled: status !== "PAID" && status !== "PROCESSING" && status !== "SHIPPED" },
    {
      label: status === "CANCELED" ? "Pedido cancelado" : "Cancelar pedido",
      icon: "×",
      action: "canceled",
      disabled: status === "CANCELED",
    },
    { label: "Excluir", icon: "−", action: "delete", disabled: status !== "CANCELED" },
  ];

  return (
    <div
      ref={menuRef}
      style={{ top, left, maxHeight }}
      className="fixed z-[80] w-[210px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-left text-xs shadow-2xl"
    >
      {items.map((item) => (
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className={menuItemClass(item)}
          >
            <MenuIcon item={item} />
            <span>{item.label}</span>
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.action === "paid") {
                onPayment();
                return;
              }

              if (item.action === "shipped") {
                onShipment();
                return;
              }

              if (item.action === "label") {
                onLabel();
                return;
              }

              if (item.action === "proof") {
                onProof();
                return;
              }

              if (item.action === "delivery") {
                onDelivery();
                return;
              }

              if (item.action === "canceled") {
                onCancel();
                return;
              }

              if (item.action === "delete") {
                onDelete();
                return;
              }

              if (item.action === "return") {
                onReturn();
                return;
              }

              if (item.action) {
                onAction(orderId, item.action);
                return;
              }

              onClose();
            }}
            disabled={isPending || item.disabled}
            className={menuItemClass(item)}
          >
            <MenuIcon item={item} />
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
}

function TrackingCodeModal({
  order,
  shippingMethods,
  isPending,
  onClose,
  onSubmit,
}: {
  order: OrderRow;
  shippingMethods: Array<{ id: string; name: string }>;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const address = [
    order.shippingStreet,
    order.shippingNumber,
    order.shippingNeighborhood,
    order.shippingCity,
    order.shippingState,
    order.shippingZipCode,
  ].filter(Boolean).join(" - ");

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <form action={onSubmit} className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <h2 className="text-xl font-black text-slate-700">Código de Rastreio</h2>
          <button type="button" onClick={onClose} className="text-4xl font-black leading-none text-slate-600">
            ×
          </button>
        </header>

        <div className="p-5">
          <div className="flex gap-4 rounded border-l-4 border-cyan-400 bg-slate-50 p-4 text-slate-500">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-400 text-2xl font-black italic text-white">
              i
            </span>
            <p className="text-base leading-7">
              Insira abaixo a empresa de transporte e o código de rastreio do pedido enviado.
              O comprador verá estes dados no painel dele para acompanhar a entrega.
            </p>
          </div>

          <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-5">
            <InfoLine label="Código do pedido" value={order.number} />
            <InfoLine label="Cliente" value={order.customerName} />
            <InfoLine label="Endereço" value={address || "Endereço não informado"} />

            <label className="mt-4 grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
              <span className="font-bold text-slate-600">Empresa de transporte ➜</span>
              <select
                name="shippingMethod"
                required
                className="h-12 rounded border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">Selecione a empresa</option>
                {shippingMethods.map((method) => (
                  <option key={method.id} value={method.name}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
              <span className="font-bold text-slate-600">Código de rastreio ➜</span>
              <input
                name="trackingCode"
                required
                className="h-12 rounded border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>

            <label className="mt-4 grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
              <span className="font-bold text-slate-600">Prazo estimado ➜</span>
              <input
                name="shippingDeadline"
                placeholder="Ex: 5 dias úteis"
                className="h-12 rounded border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>
          </div>
        </div>

        <footer className="flex justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded bg-slate-600 px-8 py-3 text-lg font-black text-white">
            Fechar
          </button>
          <button disabled={isPending} className="rounded bg-green-600 px-8 py-3 text-lg font-black text-white disabled:bg-slate-300">
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ShippingLabelModal({
  order,
  shippingMethods,
  isPending,
  onClose,
  onSubmit,
}: {
  order: OrderRow;
  shippingMethods: Array<{ id: string; name: string }>;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <form action={onSubmit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <h2 className="text-xl font-black text-slate-700">Gerar etiqueta</h2>
          <button type="button" onClick={onClose} className="text-4xl font-black leading-none text-slate-600">
            ×
          </button>
        </header>
        <div className="grid gap-4 p-6">
          <div className="rounded border border-slate-200 bg-slate-50 p-5">
            <InfoLine label="Código do pedido" value={order.number} />
            <InfoLine label="Cliente" value={order.customerName} />
            <InfoLine label="Valor" value={formatCurrency(order.total)} />
          </div>
          <label className="grid gap-2">
            <span className="font-bold text-slate-600">Transportadora</span>
            <select
              name="carrier"
              required
              className="h-12 rounded border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">Selecione a transportadora</option>
              {shippingMethods.map((method) => (
                <option key={method.id} value={method.name}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="font-bold text-slate-600">Serviço</span>
            <input
              name="service"
              placeholder="Ex: PAC, Sedex, Jadlog Package"
              className="h-12 rounded border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <label className="grid gap-2">
            <span className="font-bold text-slate-600">Observações da etiqueta</span>
            <textarea
              name="notes"
              placeholder="Informações internas sobre a etiqueta"
              className="min-h-24 rounded border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500"
            />
          </label>
        </div>
        <footer className="flex justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded bg-slate-600 px-8 py-3 text-sm font-black text-white">
            Cancelar
          </button>
          <button disabled={isPending} className="rounded bg-green-600 px-8 py-3 text-sm font-black text-white disabled:bg-slate-300">
            {isPending ? "Gerando..." : "Gerar etiqueta"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DeliveryConfirmationModal({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: OrderRow;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 5);

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <form action={onSubmit} className="w-full max-w-xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              Confirmação de entrega
            </p>
            <h2 className="mt-1 text-xl font-black">Pedido {order.number}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-3xl font-black leading-none">
            ×
          </button>
        </header>
        <div className="grid gap-4 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <InfoLine label="Cliente" value={order.customerName} />
            <InfoLine label="Valor" value={formatCurrency(order.total)} />
            <InfoLine label="Transportadora" value={order.shippingMethod ?? "Não informado"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">Data da entrega</span>
              <input
                name="deliveredDate"
                type="date"
                required
                defaultValue={today}
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">Hora da entrega</span>
              <input
                name="deliveredTime"
                type="time"
                required
                defaultValue={currentTime}
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-700">Quem recebeu</span>
            <input
              name="receivedBy"
              required
              placeholder="Nome da pessoa que recebeu o pedido"
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
            Ao confirmar, o pedido será movido para a aba Pedido Entregue e o comprador verá os dados da entrega.
          </p>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600">
            Cancelar
          </button>
          <button disabled={isPending} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
            {isPending ? "Confirmando..." : "Confirmar entrega"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ConfirmOrderDialog({
  order,
  title,
  message,
  confirmLabel,
  tone,
  isPending,
  onClose,
  onConfirm,
}: {
  order: OrderRow;
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "success";
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmClass = tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700";

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Confirmação</p>
          <h2 className="mt-1 text-xl font-black">{title}</h2>
        </header>
        <div className="grid gap-4 p-6 text-sm text-slate-600">
          <p className="font-semibold leading-6">{message}</p>
          <div className="rounded-xl bg-slate-50 p-4">
            <InfoLine label="Pedido" value={order.number} />
            <InfoLine label="Cliente" value={order.customerName} />
            <InfoLine label="Valor" value={formatCurrency(order.total)} />
          </div>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600">
            Voltar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-full px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300 ${confirmClass}`}
          >
            {isPending ? "Processando..." : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PaymentReviewModal({
  order,
  isPending,
  onClose,
  onConfirm,
}: {
  order: OrderRow;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const proof = getPaymentProof(order.integrationStatus);
  const canConfirmWithoutProof = ["customizado", "dinheiro", "manual"].includes(order.paymentMethod ?? "");
  const canConfirm = canConfirmWithoutProof || Boolean(proof);

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <h2 className="text-xl font-black text-slate-700">Confirmar pagamento</h2>
          <button type="button" onClick={onClose} className="text-4xl font-black leading-none text-slate-600">
            ×
          </button>
        </header>

        <div className="grid gap-5 p-6">
          <div className="rounded border border-slate-200 bg-slate-50 p-5">
            <InfoLine label="Código do pedido" value={order.number} />
            <InfoLine label="Cliente" value={order.customerName} />
            <InfoLine label="Forma de pagamento" value={formatPayment(order.paymentMethod)} />
            <InfoLine label="Valor" value={formatCurrency(order.total)} />
          </div>

          {proof ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">
              <h3 className="font-black">Dados enviados pelo comprador</h3>
              <p className="mt-2">Pagador: <strong>{proof.payerName}</strong></p>
              <p>CPF/CNPJ: <strong>{proof.payerDocument}</strong></p>
              <a
                href={proof.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700"
              >
                Abrir comprovante
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
              {canConfirmWithoutProof
                ? "Pagamento em mãos pode ser confirmado manualmente pelo lojista."
                : "Aguardando o comprador enviar os dados e o comprovante de pagamento."}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded bg-slate-600 px-8 py-3 text-lg font-black text-white">
            Fechar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || !canConfirm}
            className="rounded bg-green-600 px-8 py-3 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Confirmando..." : "Confirmar pagamento"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PaymentProofReviewModal({
  order,
  onClose,
}: {
  order: OrderRow;
  onClose: () => void;
}) {
  const proof = getPaymentProof(order.integrationStatus);
  const [expanded, setExpanded] = useState(false);

  if (!proof) {
    return null;
  }

  const isImage = proof.receiptUrl.startsWith("data:image/") || /\.(png|jpe?g|webp|gif)$/i.test(proof.receiptUrl);

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.35rem] bg-white shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
              Análise de pagamento
            </p>
            <h2 className="mt-1 text-xl font-black">Pedido {order.number}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl font-black leading-none">
            ×
          </button>
        </header>

        <div className="grid gap-4 p-5">
          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <ProofInfo label="Cliente" value={order.customerName} />
            <ProofInfo label="E-mail" value={order.customerEmail} />
            <ProofInfo label="Valor" value={formatCurrency(order.total)} highlight />
            <ProofInfo label="Pagador" value={proof.payerName} />
            <ProofInfo label="CPF/CNPJ" value={proof.payerDocument} />
            {proof.submittedAt ? <ProofInfo label="Enviado em" value={formatDateTime(proof.submittedAt)} /> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-sm text-slate-900">Pré-visualização</strong>
              {isImage ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700"
                >
                  Ampliar imagem
                </button>
              ) : null}
            </div>
            {isImage ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="block w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
              >
                <Image
                  src={proof.receiptUrl}
                  alt="Comprovante enviado pelo comprador"
                  width={560}
                  height={360}
                  unoptimized
                  className="mx-auto max-h-[360px] w-auto object-contain"
                />
              </button>
            ) : (
              <div className="grid min-h-52 place-items-center rounded-2xl bg-slate-50 p-8 text-center">
                <div>
                  <div className="mx-auto grid size-16 place-items-center rounded-full bg-white text-3xl shadow-sm">
                    PDF
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-500">
                    Este comprovante é um arquivo PDF. Use o botão de download para visualizar.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600"
          >
            Fechar
          </button>
          <a
            href={proof.receiptUrl}
            download={`comprovante-${order.number.replace(/\D/g, "") || order.id}`}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white"
          >
            Baixar comprovante
          </a>
        </footer>
      </div>
      {expanded && isImage ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="w-fit max-w-[92vw] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <strong className="text-sm text-slate-800">Comprovante ampliado</strong>
              <div className="flex items-center gap-2">
                <a
                  href={proof.receiptUrl}
                  download={`comprovante-${order.number.replace(/\D/g, "") || order.id}`}
                  className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                >
                  Baixar
                </a>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                >
                  Fechar
                </button>
              </div>
            </header>
            <div className="grid max-h-[78vh] max-w-[92vw] place-items-center bg-slate-50 p-4">
              <Image
                src={proof.receiptUrl}
                alt="Comprovante ampliado"
                width={900}
                height={700}
                unoptimized
                className="h-auto max-h-[72vh] w-auto max-w-[86vw] rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-2 text-sm md:grid-cols-[180px_1fr]">
      <span className="font-bold text-slate-600">{label} ➜</span>
      <span className="text-slate-600">{value}</span>
    </div>
  );
}

function ProofInfo({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <strong className={`mt-1 block truncate text-sm ${highlight ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </strong>
    </div>
  );
}

function getPaymentProof(value: Record<string, unknown>) {
  const proof = value.paymentProof;

  if (!proof || typeof proof !== "object") {
    return null;
  }

  const data = proof as Record<string, unknown>;

  if (
    typeof data.payerName !== "string" ||
    typeof data.payerDocument !== "string" ||
    typeof data.receiptUrl !== "string"
  ) {
    return null;
  }

  return {
    payerName: data.payerName,
    payerDocument: data.payerDocument,
    receiptUrl: data.receiptUrl,
    submittedAt: typeof data.submittedAt === "string" ? data.submittedAt : null,
  };
}

type MenuItem = {
  label: string;
  icon: string;
  action?: "paid" | "shipped" | "delivered" | "canceled" | "proof" | "label" | "delivery" | "delete" | "return";
};

function menuItemClass(item: MenuItem) {
  return `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold transition disabled:cursor-not-allowed disabled:text-slate-300 ${
    item.action === "canceled" || item.label === "Excluir"
      ? "text-red-600 hover:bg-red-50"
      : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-800"
  }`;
}

function MenuIcon({ item }: { item: MenuItem }) {
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-lg text-[13px] ${
        item.action === "canceled" || item.label === "Excluir"
          ? "bg-red-50 text-red-600"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {item.icon}
    </span>
  );
}

function formatStatus(status: string, order?: OrderRow) {
  if (order?.returnRequests.length) {
    return "Devolução em andamento";
  }

  const labels: Record<string, string> = {
    PENDING: "Aguardando pagamento",
    PAID: "Pagamento aprovado",
    PROCESSING: "Em separação",
    SHIPPED: "Pedido em trânsito",
    DELIVERED: "Concluído",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado",
  };

  return labels[status] ?? "Aguardando pagamento";
}

function formatSubStatus(paymentStatus: string | null, order?: OrderRow) {
  if (!paymentStatus) {
    return "-";
  }

  if (order?.paymentMethod === "pix-deposito" && paymentStatus === "pendente" && !getPaymentProof(order.integrationStatus)) {
    return "Aguardando comprovante";
  }

  if (order?.paymentMethod === "pix-deposito" && paymentStatus === "processando" && getPaymentProof(order.integrationStatus)) {
    return "Comprovante em análise";
  }

  const labels: Record<string, string> = {
    pendente: "Aguardando pagamento",
    pago: "Pagamento confirmado",
    processando: "Analisando pagamento",
    cancelado: "Cancelamento solicitado",
  };

  return labels[paymentStatus] ?? paymentStatus;
}

function formatPayment(method: string | null) {
  if (!method) {
    return "Pagamento não informado";
  }

  const labels: Record<string, string> = {
    pix: "Pix",
    cartao: "Cartão de crédito",
    boleto: "Boleto",
    dinheiro: "Pagamento em mãos",
  };

  return labels[method] ?? method;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
