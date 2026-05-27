"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { OrderStatus } from "@/app/generated/prisma/client";
import {
  cancelCustomerOrderAction,
  changeCustomerPasswordAction,
  confirmCustomerDeliveryAction,
  deleteCustomerAccountAction,
  logoutCustomerAction,
  requestCustomerReturnAction,
  saveCustomerAddressAction,
  submitReturnShipmentProofAction,
  submitCustomerPaymentProofAction,
  updateCustomerProfileAction,
  type CustomerPanelResult,
} from "./actions";

type DashboardStore = {
  name: string;
  subdomain: string;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
};

type DashboardCustomer = {
  id: string;
  name: string;
  email: string | null;
  accessEmail: string | null;
  phone: string | null;
  document: string | null;
  personType: string;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
};

type DashboardOrder = {
  id: string;
  number: string;
  status: OrderStatus;
  total: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  integrationStatus: Record<string, unknown>;
  shippingMethod: string | null;
  trackingCode: string | null;
  shippingDeadline: string | null;
  shippingZipCode: string | null;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingComplement: string | null;
  shippingNeighborhood: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string | null;
    name: string;
    quantity: number;
    total: string;
  }>;
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
    refundStatus: string | null;
    refundMessage: string | null;
    createdAt: string;
  } | null;
  hasReview: boolean;
};

type CustomerAddress = {
  id: string;
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

type PendingMediaFile = {
  name: string;
  dataUrl: string;
  size: number;
  type: string;
  source: "gallery" | "camera";
};

const ACTIVE_RETURN_STATUSES = ["REQUESTED", "APPROVED", "SHIPPED_BY_CUSTOMER"] as const;
const COMPLETED_RETURN_STATUSES = ["RECEIVED_BY_MERCHANT", "REFUND_REQUESTED", "REFUNDED"] as const;

type TabId = "dashboard" | "orders" | "profile" | "addresses" | "security";
type OrderFilter = "pending" | "confirmed" | "preparing" | "shipping" | "completed" | "canceled";

export function CustomerDashboard({
  store,
  customer,
  orders,
}: {
  store: DashboardStore;
  customer: DashboardCustomer;
  orders: DashboardOrder[];
}) {
  const notes = parseNotes(customer.notes);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("pending");
  const [paymentOrder, setPaymentOrder] = useState<DashboardOrder | null>(null);
  const [paymentSentOrder, setPaymentSentOrder] = useState<DashboardOrder | null>(null);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<DashboardOrder | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<DashboardOrder | null>(null);
  const [returnOrder, setReturnOrder] = useState<DashboardOrder | null>(null);
  const [returnProofOrder, setReturnProofOrder] = useState<DashboardOrder | null>(null);
  const [returnProofFeedback, setReturnProofFeedback] = useState<CustomerPanelResult | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [feedback, setFeedback] = useState<CustomerPanelResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const primaryColor = store.primaryColor ?? "#0f172a";
  const accentColor = store.accentColor ?? "#10b981";
  const storePath = `/store/${store.subdomain}`;
  const addresses = useMemo(() => buildAddresses(customer, notes.addresses), [customer, notes.addresses]);
  const avatarUrl = typeof notes.avatarUrl === "string" ? notes.avatarUrl : "";
  const filteredOrders = orders.filter((order) => matchesFilter(order, orderFilter));
  const menuItems: Array<{ id: TabId; label: string; icon: CustomerMenuIconName }> = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "orders", label: "Pedidos", icon: "orders" },
    { id: "profile", label: "Perfil", icon: "profile" },
    { id: "addresses", label: "Configuração", icon: "settings" },
    { id: "security", label: "Segurança", icon: "security" },
  ];

  function runAction(action: (formData: FormData) => Promise<CustomerPanelResult>, formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await action(formData));
    });
  }

  function submitPaymentProofFromOrders(formData: FormData) {
    if (!paymentOrder) return;

    const currentOrder = paymentOrder;
    setFeedback(null);
    startTransition(async () => {
      const result = await submitCustomerPaymentProofAction(store.subdomain, formData);
      setFeedback(result);

      if (result.type === "success") {
        setPaymentOrder(null);
        setPaymentSentOrder(currentOrder);
      }
    });
  }

  function submitCancelOrder(formData: FormData) {
    if (!cancelOrderTarget) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await cancelCustomerOrderAction(store.subdomain, formData);
      setFeedback(result);
      if (result.type === "success") setCancelOrderTarget(null);
    });
  }

  function submitDeliveryConfirmation(formData: FormData) {
    if (!deliveryOrder) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await confirmCustomerDeliveryAction(store.subdomain, formData);
      setFeedback(result);
      if (result.type === "success") setDeliveryOrder(null);
    });
  }

  function submitReturnRequest(formData: FormData) {
    if (!returnOrder) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await requestCustomerReturnAction(store.subdomain, formData);
      if (result.type === "success") setReturnOrder(null);
      setFeedback({
        type: result.type,
        message: result.type === "success"
          ? "Solicitação de devolução enviada com sucesso. Agora ela está sendo processada pelo lojista."
          : result.message,
      });
    });
  }

  function submitReturnProof(formData: FormData) {
    if (!returnProofOrder) return;
    setFeedback(null);
    setReturnProofFeedback(null);
    startTransition(async () => {
      const result = await submitReturnShipmentProofAction(store.subdomain, formData);
      setReturnProofFeedback({
        type: result.type,
        message: result.type === "success"
          ? "Comprovante da devolução enviado com sucesso. Agora a loja vai validar o recebimento."
          : result.message,
      });
      if (result.type === "success") {
        setReturnProofOrder(null);
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-white/10 text-white" style={{ background: primaryColor }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href={storePath} className="flex items-center gap-3">
            {store.logoUrl ? (
              <Image src={store.logoUrl} alt={store.name} width={96} height={48} unoptimized className="max-h-12 w-auto rounded-xl object-contain" />
            ) : (
              <span className="grid size-11 place-items-center rounded-xl font-black text-white" style={{ background: accentColor }}>
                {store.name.charAt(0)}
              </span>
            )}
            <span>
              <strong className="block leading-none">{store.name}</strong>
              <small className="text-white/60">Área do comprador</small>
            </span>
          </Link>
          <Link href={storePath} className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
            Voltar para loja
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="p-6" style={{ background: "linear-gradient(135deg,#ffffff,#f8fafc)" }}>
            <div className="flex items-center gap-4">
              <Avatar name={customer.name} avatarUrl={avatarUrl} accentColor={accentColor} />
              <div>
                <p className="text-sm font-black" style={{ color: accentColor }}>
                  Bem-vindo, {customer.name}
                </p>
                <h1 className="mt-1 text-3xl font-black">Painel do comprador</h1>
                <p className="mt-2 text-sm text-slate-500">
                  {customer.email ?? customer.accessEmail ?? "E-mail não informado"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {feedback ? (
          <div className={`mb-5 rounded-2xl border p-4 text-sm font-bold ${feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
            }`}>
            {feedback.message}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
          <aside className="h-fit rounded-[2rem] bg-white p-3 shadow-sm lg:sticky lg:top-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${activeTab === item.id ? "text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                style={{ background: activeTab === item.id ? primaryColor : undefined }}
              >
                <span className={`grid size-9 place-items-center rounded-xl ${activeTab === item.id ? "bg-white/10 text-white" : "bg-slate-50 text-slate-500"
                  }`}>
                  <CustomerMenuIcon name={item.icon} />
                </span>
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowLogoutDialog(true)}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600">
                <CustomerMenuIcon name="logout" />
              </span>
              Sair
            </button>
          </aside>

          <div className="grid gap-6">
            {activeTab === "dashboard" ? (
              <DashboardHome
                setActiveTab={setActiveTab}
                setOrderFilter={setOrderFilter}
                accentColor={accentColor}
              />
            ) : null}

            {activeTab === "orders" ? (
              <OrdersPanel
                orders={orders}
                visibleOrders={filteredOrders}
                orderFilter={orderFilter}
                setOrderFilter={setOrderFilter}
                onPayOrder={setPaymentOrder}
                onCancelOrder={setCancelOrderTarget}
                onConfirmDelivery={setDeliveryOrder}
                onRequestReturn={setReturnOrder}
                onSubmitReturnProof={setReturnProofOrder}
              />
            ) : null}

            {activeTab === "profile" ? (
              <ProfilePanel
                customer={customer}
                avatarUrl={avatarUrl}
                isPending={isPending}
                onSubmit={(formData) =>
                  runAction(updateCustomerProfileAction.bind(null, store.subdomain), formData)
                }
              />
            ) : null}

            {activeTab === "addresses" ? (
              <AddressesPanel
                addresses={addresses}
                isPending={isPending}
                onSubmit={(formData) =>
                  runAction(saveCustomerAddressAction.bind(null, store.subdomain), formData)
                }
              />
            ) : null}

            {activeTab === "security" ? (
              <SecurityPanel
                storeSlug={store.subdomain}
                isPending={isPending}
                onPasswordSubmit={(formData) =>
                  runAction(changeCustomerPasswordAction.bind(null, store.subdomain), formData)
                }
              />
            ) : null}
          </div>
        </div>
        {paymentOrder ? (
          <CustomerPaymentModal
            order={paymentOrder}
            isPending={isPending}
            onClose={() => setPaymentOrder(null)}
            onSubmit={submitPaymentProofFromOrders}
          />
        ) : null}
        {paymentSentOrder ? (
          <PaymentSentDialog
            order={paymentSentOrder}
            onClose={() => setPaymentSentOrder(null)}
          />
        ) : null}
        {cancelOrderTarget ? (
          <CancelOrderDialog
            order={cancelOrderTarget}
            isPending={isPending}
            onClose={() => setCancelOrderTarget(null)}
            onSubmit={submitCancelOrder}
          />
        ) : null}
        {deliveryOrder ? (
          <DeliveryReviewDialog
            order={deliveryOrder}
            isPending={isPending}
            onClose={() => setDeliveryOrder(null)}
            onSubmit={submitDeliveryConfirmation}
          />
        ) : null}
        {returnOrder ? (
          <ReturnRequestDialog
            order={returnOrder}
            isPending={isPending}
            onClose={() => setReturnOrder(null)}
            onSubmit={submitReturnRequest}
          />
        ) : null}
        {returnProofOrder ? (
          <ReturnProofDialog
            order={returnProofOrder}
            isPending={isPending}
            onClose={() => setReturnProofOrder(null)}
            onSubmit={submitReturnProof}
          />
        ) : null}
        {returnProofFeedback ? (
          <ActionFeedbackDialog
            feedback={returnProofFeedback}
            title={returnProofFeedback.type === "success" ? "Comprovante enviado" : "Erro ao enviar comprovante"}
            onClose={() => setReturnProofFeedback(null)}
          />
        ) : null}
        {showLogoutDialog ? (
          <LogoutDialog
            storeSlug={store.subdomain}
            onClose={() => setShowLogoutDialog(false)}
          />
        ) : null}
      </section>
    </main>
  );
}

function DashboardHome({
  setActiveTab,
  setOrderFilter,
  accentColor,
}: {
  setActiveTab: (tab: TabId) => void;
  setOrderFilter: (filter: OrderFilter) => void;
  accentColor: string;
}) {
  const shortcuts: Array<{ label: string; icon: ShortcutIconName; tab: TabId; filter?: OrderFilter }> = [
    { label: "Meus pedidos", icon: "orders", tab: "orders", filter: "pending" },
    { label: "Meus dados", icon: "profile", tab: "profile" },
    { label: "Endereço", icon: "address", tab: "addresses" },
    { label: "Segurança", icon: "security", tab: "security" },
    { label: "Em transporte", icon: "shipping", tab: "orders", filter: "shipping" },
    { label: "Concluídos", icon: "completed", tab: "orders", filter: "completed" },
  ];

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Atalhos</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Acesse rapidamente seus pedidos, dados, endereços e segurança.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            onClick={() => {
              if (shortcut.filter) setOrderFilter(shortcut.filter);
              setActiveTab(shortcut.tab);
            }}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left font-black transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: accentColor }}>
              <ShortcutIcon name={shortcut.icon} />
            </span>
            {shortcut.label}
          </button>
        ))}
      </div>
    </section>
  );
}

type CustomerMenuIconName = "dashboard" | "orders" | "profile" | "settings" | "security" | "logout";

function CustomerMenuIcon({ name }: { name: CustomerMenuIconName }) {
  const commonProps = {
    className: "size-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <path d="M4 11 12 4l8 7" />
          <path d="M6 10v9h12v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      );
    case "orders":
      return (
        <svg {...commonProps}>
          <path d="M6 3h12v18H6z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.5-.2-.1a1.7 1.7 0 0 0-2 .4l-.1.1h-4l-.1-.1a1.7 1.7 0 0 0-2-.4l-.2.1-2-3.5.1-.1A1.7 1.7 0 0 0 4.6 15l-.2-.1v-4l.2-.1A1.7 1.7 0 0 0 4.3 9l-.1-.1 2-3.5.2.1a1.7 1.7 0 0 0 2-.4l.1-.1h4l.1.1a1.7 1.7 0 0 0 2 .4l.2-.1 2 3.5-.1.1a1.7 1.7 0 0 0 .3 1.9l.2.1v4z" />
        </svg>
      );
    case "security":
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9.5 12 1.8 1.8 3.7-4" />
        </svg>
      );
    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 17 15 12l-5-5" />
          <path d="M15 12H3" />
          <path d="M21 3v18" />
        </svg>
      );
  }
}

function LogoutDialog({
  storeSlug,
  onClose,
}: {
  storeSlug: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
          <CustomerMenuIcon name="logout" />
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">Deseja sair da sua conta?</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Você será desconectado da área do comprador desta loja.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600"
          >
            Cancelar
          </button>
          <form action={logoutCustomerAction.bind(null, storeSlug)}>
            <button className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-black text-white">
              Sim, sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

type ShortcutIconName = "orders" | "profile" | "address" | "security" | "shipping" | "completed";

function ShortcutIcon({ name }: { name: ShortcutIconName }) {
  const commonProps = {
    className: "size-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "orders":
      return (
        <svg {...commonProps}>
          <path d="M7 4h10" />
          <path d="M7 8h10" />
          <path d="M9 12h6" />
          <path d="M6 20h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "address":
      return (
        <svg {...commonProps}>
          <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "security":
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9.5 12 1.8 1.8 3.7-4" />
        </svg>
      );
    case "shipping":
      return (
        <svg {...commonProps}>
          <path d="M3 7h11v10H3z" />
          <path d="M14 10h4l3 3v4h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      );
    case "completed":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.2 2.2 4.8-5.2" />
        </svg>
      );
  }
}

function OrdersPanel({
  orders,
  visibleOrders,
  orderFilter,
  setOrderFilter,
  onPayOrder,
  onCancelOrder,
  onConfirmDelivery,
  onRequestReturn,
  onSubmitReturnProof,
}: {
  orders: DashboardOrder[];
  visibleOrders: DashboardOrder[];
  orderFilter: OrderFilter;
  setOrderFilter: (filter: OrderFilter) => void;
  onPayOrder: (order: DashboardOrder) => void;
  onCancelOrder: (order: DashboardOrder) => void;
  onConfirmDelivery: (order: DashboardOrder) => void;
  onRequestReturn: (order: DashboardOrder) => void;
  onSubmitReturnProof: (order: DashboardOrder) => void;
}) {
  const filters: Array<{ id: OrderFilter; label: string; description: string; icon: string }> = [
    { id: "pending", label: "Aguardando pagamento", description: "Pedidos esperando pagamento", icon: "R$" },
    { id: "confirmed", label: "Pedido confirmado", description: "Pagamento aprovado", icon: "✓" },
    { id: "preparing", label: "Pedido em preparação", description: "Separação pela loja", icon: "▣" },
    { id: "shipping", label: "Pedido em transporte", description: "Rastreio e envio", icon: "↗" },
    { id: "completed", label: "Pedidos concluídos", description: "Entregues ao comprador", icon: "★" },
    { id: "canceled", label: "Pedidos cancelados", description: "Cancelados ou expirados", icon: "×" },
  ];

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Área de compras</p>
          <h2 className="text-2xl font-black">Meus pedidos</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-500">
          {orders.length} pedido(s)
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setOrderFilter(filter.id)}
            className={`group rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${orderFilter === filter.id
                ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-white"
              }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className={`grid size-10 place-items-center rounded-2xl text-sm font-black ${orderFilter === filter.id ? "bg-white/10 text-white" : "bg-white text-slate-700"
                }`}>
                {filter.icon}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${orderFilter === filter.id ? "bg-white text-slate-950" : "bg-slate-200 text-slate-700"
                }`}>
                {orders.filter((order) => matchesFilter(order, filter.id)).length}
              </span>
            </span>
            <strong className="mt-3 block text-sm">{filter.label}</strong>
            <span className={`mt-1 block text-xs font-semibold ${orderFilter === filter.id ? "text-white/65" : "text-slate-500"
              }`}>
              {filter.description}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4">
        {visibleOrders.length > 0 ? (
          visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              detailed={orderFilter === "shipping"}
              onPayOrder={onPayOrder}
              onCancelOrder={onCancelOrder}
              onConfirmDelivery={onConfirmDelivery}
              onRequestReturn={onRequestReturn}
              onSubmitReturnProof={onSubmitReturnProof}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
            Nenhum pedido nesta categoria.
          </div>
        )}
      </div>
    </section>
  );
}

function OrderCard({
  order,
  detailed,
  onPayOrder,
  onCancelOrder,
  onConfirmDelivery,
  onRequestReturn,
  onSubmitReturnProof,
}: {
  order: DashboardOrder;
  detailed?: boolean;
  onPayOrder: (order: DashboardOrder) => void;
  onCancelOrder: (order: DashboardOrder) => void;
  onConfirmDelivery: (order: DashboardOrder) => void;
  onRequestReturn: (order: DashboardOrder) => void;
  onSubmitReturnProof: (order: DashboardOrder) => void;
}) {
  const status = getOrderStatus(order.status);
  const [isOpen, setIsOpen] = useState(false);
  const canPayPix = order.paymentMethod === "pix-deposito" && order.status === "PENDING" && order.paymentStatus !== "processando";
  const canCancelOrder = canCustomerCancelOrder(order);
  const activeReturnRequest = order.returnRequests.find((request) => isActiveReturnStatus(request.status));
  const completedReturnRequest = order.returnRequests.find((request) => isCompletedReturnStatus(request.status)) ??
    getCompletedReturnFromOrder(order) ??
    order.returnRequests.find((request) => !["REJECTED", "EXPIRED", ...ACTIVE_RETURN_STATUSES].includes(request.status));
  const rejectedReturnRequest = order.returnRequests.find((request) => request.status === "REJECTED");
  const expiredReturnRequest = order.returnRequests.find((request) => request.status === "EXPIRED");
  const hasBlockingReturn = Boolean(
    activeReturnRequest ||
    completedReturnRequest ||
    expiredReturnRequest ||
    order.returnRequests.some((request) => request.status !== "REJECTED") ||
    getCompletedReturnFromOrder(order),
  );
  const canConfirmDelivery = order.status === "SHIPPED" && !order.hasReview && !hasBlockingReturn;
  const canReviewCompletedReturn = Boolean(completedReturnRequest) && !order.hasReview;
  const deliveryConfirmation = getDeliveryConfirmation(order.integrationStatus);
  const returnWindow = getReturnWindow(order);
  const canRequestReturn = !hasBlockingReturn && (
    order.status === "SHIPPED" ||
    (order.status === "DELIVERED" && returnWindow.isOpen)
  );
  const showReturnWindowInfo = order.status === "DELIVERED" && !hasBlockingReturn;
  const returnNotAvailableYet = order.status === "PAID" || order.status === "PROCESSING";
  const approvedReturn = activeReturnRequest?.status === "APPROVED" ? activeReturnRequest : undefined;
  const approvedReturnDeadline = approvedReturn ? getReturnPostingWindow(approvedReturn.updatedAt) : null;
  const firstProduct = order.items[0]?.name ?? "Produto não informado";
  const productSummary = order.items.length > 1
    ? `${firstProduct} +${order.items.length - 1} item(ns)`
    : firstProduct;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
      <div className="grid w-full gap-3 bg-gradient-to-r from-slate-50 to-white px-5 py-4 text-left lg:grid-cols-[150px_1fr_140px_190px_42px] lg:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pedido</p>
          <h3 className="text-lg font-black">{order.number}</h3>
        </div>
        <div>
          <p className="truncate text-sm font-black text-slate-900">{productSummary}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{formatPayment(order.paymentMethod)}</p>
        </div>
        <strong className="text-base text-slate-950">{formatCurrency(Number(order.total))}</strong>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-4 py-2 text-xs font-black uppercase ${status.className}`}>
            {status.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="grid size-9 place-items-center rounded-full bg-white text-sm font-black text-slate-500 shadow-sm transition hover:bg-slate-950 hover:text-white"
          aria-label={isOpen ? "Recolher detalhes do pedido" : "Expandir detalhes do pedido"}
        >
          {isOpen ? "−" : "+"}
        </button>
      </div>
      {isOpen ? (
        <div className="grid gap-4 border-t border-slate-100 p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-sm text-slate-900">Itens do pedido</strong>
              <span className="text-xs font-bold text-slate-500">{order.items.length} item(ns)</span>
            </div>
            <div className="grid gap-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-sm">
                  <span><strong>{item.quantity}x</strong> {item.name}</span>
                  <strong>{formatCurrency(Number(item.total))}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2 rounded-2xl border border-slate-100 p-4 text-sm text-slate-500 sm:grid-cols-3">
            <span>Criado em <strong className="text-slate-700">{formatDate(order.createdAt)}</strong></span>
            <span>Pagamento: <strong className="text-slate-700">{formatPayment(order.paymentMethod)}</strong></span>
            <span>Entrega: <strong className="text-slate-700">{order.shippingMethod || "A definir"}</strong></span>
          </div>
          {canPayPix ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div>
                <strong className="block text-sm text-amber-900">Pagamento pendente</strong>
                <span className="text-xs font-semibold text-amber-700">
                  Escaneie o QR PIX ou envie o comprovante para a loja analisar.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onPayOrder(order)}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                Pagar agora
              </button>
            </div>
          ) : null}
          {canCancelOrder ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
              <div>
                <strong className="block text-sm text-red-900">Deseja cancelar este pedido?</strong>
                <span className="text-xs font-semibold text-red-700">
                  Você pode cancelar enquanto o pagamento ou envio ainda não foi confirmado.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onCancelOrder(order)}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white"
              >
                Cancelar pedido
              </button>
            </div>
          ) : null}
          {canConfirmDelivery || canRequestReturn || approvedReturn || canReviewCompletedReturn ? (
            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
              {canConfirmDelivery ? (
                <button type="button" onClick={() => onConfirmDelivery(order)} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white">
                  Confirmar entrega
                </button>
              ) : null}
              {canRequestReturn ? (
                <button type="button" onClick={() => onRequestReturn(order)} className="rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-white">
                  Solicitar devolução
                </button>
              ) : null}
              {canReviewCompletedReturn ? (
                <button type="button" onClick={() => onConfirmDelivery(order)} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white">
                  Avaliar pedido
                </button>
              ) : null}
              {approvedReturn ? (
                <button type="button" onClick={() => onSubmitReturnProof(order)} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
                  Enviar comprovante da devolução
                </button>
              ) : null}
            </div>
          ) : null}
          {showReturnWindowInfo ? (
            <div className={`rounded-2xl border p-4 text-sm ${returnWindow.isExpired ? "border-red-100 bg-red-50 text-red-800" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
              <strong className="block">Prazo para devolução</strong>
              <span className="mt-2 block font-semibold">
                Você tem 7 dias corridos após a confirmação da entrega para solicitar a devolução.
              </span>
              {returnWindow.deadlineLabel ? (
                <span className="mt-1 block">
                  {returnWindow.isExpired
                    ? `O prazo expirou em ${returnWindow.deadlineLabel}. Não é mais possível solicitar devolução para este pedido.`
                    : `Você pode solicitar devolução até ${returnWindow.deadlineLabel}.`}
                </span>
              ) : (
                <span className="mt-1 block">Aguardando a data de confirmação da entrega para calcular o prazo.</span>
              )}
            </div>
          ) : null}
          {returnNotAvailableYet ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              <strong className="block text-slate-900">Devolução</strong>
              A solicitação de devolução ficará disponível após o envio do pedido.
            </div>
          ) : null}
          {order.status === "SHIPPED" && !hasBlockingReturn && !canRequestReturn ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              <strong className="block text-slate-900">Devolução</strong>
              Após confirmar a entrega, você terá 7 dias corridos para solicitar a devolução.
            </div>
          ) : null}
          {activeReturnRequest ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              <strong className="block">Aguardando devolução</strong>
              <span className="mt-2 block font-semibold">
                Sua solicitação de devolução está sendo processada pelo lojista.
              </span>
              <span className="mt-2 block">Status: {formatReturnStatus(activeReturnRequest.status)}</span>
              <span className="mt-1 block">Motivo: {activeReturnRequest.otherReason || activeReturnRequest.reason}</span>
              <span className="mt-1 block">Solicitada em: {formatDateTime(activeReturnRequest.createdAt)}</span>
              {activeReturnRequest.merchantPackageInstructions ? (
                <span className="mt-2 block">Instruções da loja: {activeReturnRequest.merchantPackageInstructions}</span>
              ) : null}
              {activeReturnRequest.merchantPostCode ? (
                <span className="mt-1 block">Código de postagem: {activeReturnRequest.merchantPostCode}</span>
              ) : null}
              {approvedReturnDeadline ? (
                <div className="mt-3 rounded-2xl bg-white/70 p-3 text-amber-950">
                  <strong className="block">Prazo para enviar a devolução</strong>
                  <span className="mt-1 block">Aprovada em: {formatDateTime(activeReturnRequest.updatedAt)}</span>
                  <span className="mt-1 block">Prazo final: {approvedReturnDeadline.deadlineLabel}</span>
                  <span className="mt-1 block font-black">
                    Tempo restante: {approvedReturnDeadline.remainingLabel}
                  </span>
                </div>
              ) : null}
              {activeReturnRequest.refundMessage ? (
                <span className="mt-1 block">Estorno: {activeReturnRequest.refundMessage}</span>
              ) : null}
            </div>
          ) : null}
          {completedReturnRequest ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong className="block">Devolução concluída</strong>
              <span className="mt-2 block font-semibold">
                {completedReturnRequest.status === "RECEIVED_BY_MERCHANT"
                  ? "A loja validou o recebimento da devolução. O estorno já pode ser processado pelo lojista."
                  : "A devolução foi validada e o estorno foi processado para este pedido."}
              </span>
              <span className="mt-2 block">Status: {formatReturnStatus(completedReturnRequest.status)}</span>
              <span className="mt-1 block">Solicitada em: {formatDateTime(completedReturnRequest.createdAt)}</span>
              <span className="mt-1 block">Atualizada em: {formatDateTime(completedReturnRequest.updatedAt)}</span>
              {completedReturnRequest.merchantNotes ? (
                <span className="mt-2 block">Observação da loja: {completedReturnRequest.merchantNotes}</span>
              ) : null}
              {completedReturnRequest.refundMessage ? (
                <span className="mt-2 block font-semibold">Estorno: {completedReturnRequest.refundMessage}</span>
              ) : null}
            </div>
          ) : null}
          {rejectedReturnRequest ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
              <strong className="block">Devolução recusada</strong>
              <span className="mt-2 block">Solicitada em: {formatDateTime(rejectedReturnRequest.createdAt)}</span>
              <span className="mt-1 block">Recusada em: {formatDateTime(rejectedReturnRequest.updatedAt)}</span>
              <span className="mt-2 block">Motivo da recusa: {rejectedReturnRequest.merchantNotes || "Não informado"}</span>
              <span className="mt-2 block font-semibold">
                Você pode confirmar a entrega ou solicitar uma nova devolução com mais informações.
              </span>
            </div>
          ) : null}
          {order.returnRequests.some((request) => request.status === "EXPIRED") ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <strong className="block text-slate-950">Prazo da devolução expirado</strong>
              <span className="mt-2 block font-semibold">
                O prazo para envio da devolução por sua parte expirou e o pedido foi concluído como entregue com sucesso.
              </span>
            </div>
          ) : null}
          {detailed ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
              <strong className="block">Acompanhamento da entrega</strong>
              <span className="mt-2 block">Transportadora: {order.shippingMethod || "Aguardando definição pela loja"}</span>
              <span className="mt-1 block">Código de rastreio: {order.trackingCode || "Aguardando envio pela loja"}</span>
              <span className="mt-1 block">Prazo: {order.shippingDeadline || "Em definição"}</span>
              <span className="mt-1 block">
                Endereço: {[order.shippingStreet, order.shippingNumber, order.shippingNeighborhood, order.shippingCity, order.shippingState].filter(Boolean).join(", ") || "Não informado"}
              </span>
              {order.trackingCode ? (
                <span className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-indigo-700">
                  Use este código no site da transportadora para acompanhar a entrega.
                </span>
              ) : null}
            </div>
          ) : null}
          {order.status === "DELIVERED" && deliveryConfirmation ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong className="block">Pedido entregue</strong>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <span>Data: <strong>{formatDateOnly(deliveryConfirmation.deliveredDate)}</strong></span>
                <span>Hora: <strong>{deliveryConfirmation.deliveredTime}</strong></span>
                <span>Recebido por: <strong>{deliveryConfirmation.receivedBy}</strong></span>
              </div>
            </div>
          ) : null}
          {order.cancellation?.refundMessage ? (
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
              <strong className="block">Status do estorno</strong>
              <span className="mt-2 block">{formatRefundStatus(order.cancellation.refundStatus)}: {order.cancellation.refundMessage}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CancelOrderDialog({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: DashboardOrder;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [reason, setReason] = useState("Desisti da compra");

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <form action={onSubmit} className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-2xl">
        <input type="hidden" name="orderId" value={order.id} />
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-2xl font-black text-red-600">
          !
        </div>
        <h2 className="mt-5 text-center text-xl font-black text-slate-950">Cancelar pedido {order.number}?</h2>
        <p className="mt-3 text-center text-sm leading-6 text-slate-600">
          Informe o motivo para que a loja acompanhe o cancelamento.
        </p>
        <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
          Motivo
          <select name="reason" value={reason} onChange={(event) => setReason(event.target.value)} className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
            <option>Desisti da compra</option>
            <option>Comprei errado</option>
            <option>Prazo de entrega longo</option>
            <option>Problema com pagamento</option>
            <option>Outro motivo</option>
          </select>
        </label>
        {reason === "Outro motivo" ? (
          <label className="mt-3 grid gap-2 text-sm font-black text-slate-700">
            Descreva o motivo
            <textarea name="otherReason" required className="min-h-24 rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-red-400" />
          </label>
        ) : null}
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600"
          >
            Não
          </button>
          <button
            disabled={isPending}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
          >
            {isPending ? "Cancelando..." : "Sim, cancelar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeliveryReviewDialog({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: DashboardOrder;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [rating, setRating] = useState(5);

  return (
    <PostSaleModal title={`Confirmar entrega ${order.number}`} onClose={onClose}>
      <form action={onSubmit} className="grid gap-4 p-5">
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="rating" value={rating} />
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Confirme apenas se você recebeu o pedido. Sua avaliação poderá aparecer na loja.
        </p>
        <RatingStars rating={rating} onChange={setRating} />
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Comentário
          <textarea name="comment" className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-emerald-400" placeholder="Conte como foi sua experiência." />
        </label>
        <MediaPickerField
          fileFieldName="reviewFiles"
          capturedFieldName="reviewCapturedPhotos"
          label="Fotos ou vídeos da avaliação"
        />
        <PostSaleModalFooter isPending={isPending} onClose={onClose} submitLabel="Confirmar entrega" pendingLabel="Enviando..." />
      </form>
    </PostSaleModal>
  );
}

function ReturnRequestDialog({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: DashboardOrder;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [reason, setReason] = useState("Produto com defeito");

  return (
    <PostSaleModal title={`Solicitar devolução ${order.number}`} onClose={onClose}>
      <form action={onSubmit} className="grid gap-4 p-5">
        <input type="hidden" name="orderId" value={order.id} />
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Motivo da devolução
          <select name="reason" value={reason} onChange={(event) => setReason(event.target.value)} required className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold">
            <option>Produto com defeito</option>
            <option>Produto diferente do anunciado</option>
            <option>Arrependimento da compra</option>
            <option>Pedido incompleto</option>
            <option>Outro motivo</option>
          </select>
        </label>
        {reason === "Outro motivo" ? (
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Descreva o motivo
            <input name="otherReason" required className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold" />
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Observações
          <textarea name="observation" className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-amber-400" placeholder="Explique o que aconteceu." />
        </label>
        <MediaPickerField
          fileFieldName="returnFiles"
          capturedFieldName="returnCapturedPhotos"
          label="Fotos ou vídeos da devolução"
        />
        <PostSaleModalFooter isPending={isPending} onClose={onClose} submitLabel="Enviar solicitação" pendingLabel="Enviando..." />
      </form>
    </PostSaleModal>
  );
}

function ReturnProofDialog({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: DashboardOrder;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const approvedReturn = order.returnRequests.find((request) => request.status === "APPROVED");

  if (!approvedReturn) return null;

  return (
    <PostSaleModal title={`Comprovante da devolução ${order.number}`} onClose={onClose}>
      <form action={onSubmit} className="grid gap-4 p-5">
        <input type="hidden" name="returnRequestId" value={approvedReturn.id} />
        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          <strong className="block text-slate-900">Instruções da loja</strong>
          <span className="mt-2 block">{approvedReturn.merchantPackageInstructions || "Siga as instruções informadas pela loja."}</span>
          {approvedReturn.merchantReturnAddress ? <span className="mt-1 block">Endereço: {approvedReturn.merchantReturnAddress}</span> : null}
          {approvedReturn.merchantPostCode ? <span className="mt-1 block">Código de postagem: {approvedReturn.merchantPostCode}</span> : null}
        </div>
        <Input name="trackingCode" label="Código de rastreio da devolução" />
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Observação
          <textarea name="observation" className="min-h-24 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" />
        </label>
        <MediaPickerField
          fileFieldName="returnProofFiles"
          capturedFieldName="returnProofCapturedPhotos"
          label="Comprovante de postagem"
        />
        <PostSaleModalFooter isPending={isPending} onClose={onClose} submitLabel="Enviar comprovante" pendingLabel="Enviando..." />
      </form>
    </PostSaleModal>
  );
}

function PostSaleModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" onClick={onClose} className="text-2xl font-black">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function PostSaleModalFooter({
  isPending,
  onClose,
  submitLabel,
  pendingLabel,
}: {
  isPending: boolean;
  onClose: () => void;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600">
        Cancelar
      </button>
      <button disabled={isPending} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
        {isPending ? pendingLabel : submitLabel}
      </button>
    </footer>
  );
}

function RatingStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-amber-100 bg-amber-50/60 p-4">
      <span className="text-sm font-black text-slate-800">Como você avalia este pedido?</span>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`grid size-12 place-items-center rounded-2xl text-3xl transition ${star <= rating
                ? "bg-white text-amber-400 shadow-sm"
                : "bg-white/70 text-slate-300 hover:text-amber-300"
              }`}
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
        <strong className="ml-1 text-sm text-slate-600">
          {rating} de 5
        </strong>
      </div>
    </div>
  );
}

function MediaPickerField({
  fileFieldName,
  capturedFieldName,
  label,
}: {
  fileFieldName: string;
  capturedFieldName: string;
  label: string;
}) {
  const [files, setFiles] = useState<PendingMediaFile[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;

    async function openCamera() {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Este navegador não permite abrir a câmera diretamente.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setCameraError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    }

    void openCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen]);

  function appendFiles(fileList: FileList | null) {
    if (!fileList) return;
    const nextFiles = Array.from(fileList);
    nextFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (dataUrl) {
          const pendingFile: PendingMediaFile = {
            name: file.name,
            dataUrl,
            size: file.size,
            type: file.type,
            source: "gallery",
          };
          setFiles((current) => [
            ...current,
            pendingFile,
          ].slice(0, 6));
        }
      };
      reader.readAsDataURL(file);
    });
    setPickerOpen(false);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function closeCamera() {
    setCameraOpen(false);
    stopCamera();
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("A câmera ainda está carregando. Tente novamente em instantes.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Não foi possível capturar a imagem.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Não foi possível gerar a foto.");
        return;
      }

      const file = new File([blob], `avaliacao-${Date.now()}.jpg`, { type: "image/jpeg" });
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (dataUrl) {
          const pendingFile: PendingMediaFile = {
            name: file.name,
            dataUrl,
            size: file.size,
            type: file.type,
            source: "camera",
          };
          setFiles((current) => [
            ...current,
            pendingFile,
          ].slice(0, 6));
        }
      };
      reader.readAsDataURL(file);
      closeCamera();
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="grid gap-3">
      <div>
        <span className="text-sm font-black text-slate-700">{label}</span>
        <p className="mt-1 text-xs font-semibold text-slate-400">As imagens são enviadas para o armazenamento seguro da loja.</p>
      </div>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="grid justify-items-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-emerald-300 hover:bg-emerald-50"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-white text-xl shadow-sm">↑</span>
        <strong className="text-sm text-slate-800">Anexar fotos ou vídeos</strong>
        <span className="text-xs font-semibold text-slate-500">Escolha de onde deseja enviar os arquivos</span>
      </button>
      {files.length > 0 ? (
        <div className="grid gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <input
                type="hidden"
                name={capturedFieldName}
                value={JSON.stringify({
                  name: file.name,
                  dataUrl: file.dataUrl,
                  type: file.type,
                })}
              />
              <span className="min-w-0">
                <strong className="block truncate text-slate-800">{file.name}</strong>
                <span className="text-xs font-semibold text-slate-400">
                  {file.type.startsWith("video/") ? "Vídeo" : "Imagem"} {file.source === "camera" ? "da câmera" : "da galeria"} · {formatFileSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <span className="text-xs font-semibold text-slate-400">Até 6 arquivos, 20 MB cada.</span>
      {pickerOpen ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Enviar mídia</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Escolha a origem dos arquivos.</p>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} className="text-2xl font-black text-slate-400">×</button>
            </div>
            <div className="mt-5 grid gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-900">
                <span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm">□</span>
                Escolher da galeria
                <input
                  name={fileFieldName}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(event) => appendFiles(event.target.files)}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setCameraOpen(true);
                }}
                className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-left text-sm font-black text-sky-900"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm">◉</span>
                Usar câmera
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {cameraOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
              <div>
                <h3 className="text-lg font-black">Câmera</h3>
                <p className="text-xs font-semibold text-white/60">Autorize o acesso para capturar a foto.</p>
              </div>
              <button type="button" onClick={closeCamera} className="text-2xl font-black">×</button>
            </header>
            <div className="grid gap-4 p-5">
              <div className="overflow-hidden rounded-3xl bg-slate-950">
                <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
              </div>
              {cameraError ? (
                <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{cameraError}</div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={closeCamera} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600">
                  Cancelar
                </button>
                <button type="button" onClick={capturePhoto} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
                  Capturar foto
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomerPaymentModal({
  order,
  isPending,
  onClose,
  onSubmit,
}: {
  order: DashboardOrder;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const pixPayment = getPixPayment(order.integrationStatus);

  function requestConfirmation(formData: FormData) {
    setPendingFormData(formData);
    setConfirmOpen(true);
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <form action={requestConfirmation} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl">
        <input type="hidden" name="orderId" value={order.id} />
        <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Pagamento pendente
            </p>
            <h2 className="mt-1 text-xl font-black">Pedido {order.number}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl font-black">×</button>
        </header>
        <div className="grid gap-3 p-5">
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
            Valor da compra: {formatCurrency(Number(order.total))}
          </div>
          {pixPayment ? (
            <div className="grid justify-items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-center">
              <Image
                src={pixPayment.qrCodeDataUrl}
                alt="QR Code PIX do pedido"
                width={220}
                height={220}
                unoptimized
                className="rounded-2xl border border-slate-100 object-contain shadow-sm"
              />
              <strong className="text-sm text-slate-900">
                Escaneie o QR Code no app do seu banco para pagar este pedido.
              </strong>
              <details className="w-full rounded-2xl bg-slate-50 p-3 text-left">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Ver PIX copia e cola
                </summary>
                <code className="mt-3 block max-h-28 overflow-auto rounded-xl bg-white p-3 text-[11px] leading-4 text-slate-700">
                  {pixPayment.copiaECola}
                </code>
              </details>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              QR PIX não encontrado neste pedido. Entre em contato com a loja.
            </div>
          )}
          <Input name="payerName" label="Nome de quem fez o pagamento" required />
          <Input name="payerDocument" label="CPF/CNPJ de quem pagou" required />
          <label className="grid gap-3">
            <span className="text-sm font-black text-slate-700">Comprovante de pagamento</span>
            <span className="grid cursor-pointer justify-items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50">
              <span className="grid size-11 place-items-center rounded-full bg-white text-xl shadow-sm">↑</span>
              <span className="text-sm font-black text-slate-800">Anexar comprovante</span>
              <span className="text-xs font-semibold text-slate-500">PNG, JPG ou PDF até 5 MB.</span>
            </span>
            <input
              name="receiptFile"
              type="file"
              accept="image/*,.pdf"
              required
              onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {receiptFile ? (
              <span className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <span className="truncate">{receiptFile.name}</span>
                <span className="shrink-0 text-xs text-emerald-600">{formatFileSize(receiptFile.size)}</span>
              </span>
            ) : null}
          </label>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600">
            Enviar depois
          </button>
          <button disabled={isPending || !pixPayment} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
            {isPending ? "Enviando..." : "Enviar comprovante"}
          </button>
        </footer>
      </form>
      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
              ✓
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-950">Confirmar envio do comprovante?</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Confirme apenas se você já realizou o PIX no valor de {formatCurrency(Number(order.total))} e anexou o comprovante correto.
            </p>
            {receiptFile ? (
              <p className="mt-4 truncate rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                {receiptFile.name}
              </p>
            ) : null}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingFormData) return;
                  setConfirmOpen(false);
                  onSubmit(pendingFormData);
                }}
                disabled={isPending}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300"
              >
                Sim, enviar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaymentSentDialog({
  order,
  onClose,
}: {
  order: DashboardOrder;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">Comprovante enviado</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Recebemos o comprovante do pedido {order.number}. Agora ele ficará em análise até a loja confirmar o pagamento.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function ActionFeedbackDialog({
  feedback,
  title,
  onClose,
}: {
  feedback: CustomerPanelResult;
  title: string;
  onClose: () => void;
}) {
  const success = feedback.type === "success";

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto grid size-16 place-items-center rounded-full text-3xl ${success ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {success ? "✓" : "!"}
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {feedback.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function ProfilePanel({
  customer,
  avatarUrl,
  isPending,
  onSubmit,
}: {
  customer: DashboardCustomer;
  avatarUrl: string;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const previewAvatar = selectedAvatar || avatarUrl;

  return (
    <form action={onSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black">Editar perfil</h2>
      <input type="hidden" name="currentAvatarUrl" value={avatarUrl} />
      <div className="mt-5 grid gap-6 lg:grid-cols-[220px_1fr]">
        <label className="grid cursor-pointer justify-items-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-sky-300 hover:bg-sky-50">
          {previewAvatar ? (
            <Image
              src={previewAvatar}
              alt="Foto do comprador"
              width={96}
              height={96}
              unoptimized
              className="size-24 rounded-full object-cover shadow-sm"
            />
          ) : (
            <span className="grid size-24 place-items-center rounded-full bg-white text-3xl font-black text-slate-500 shadow-sm">
              {customer.name.charAt(0)}
            </span>
          )}
          <span className="text-sm font-black text-slate-800">Alterar foto</span>
          <span className="text-xs font-semibold text-slate-500">Escolha uma imagem do computador ou celular.</span>
          <input
            name="avatarFile"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (!file) {
                setSelectedAvatar(null);
                return;
              }

              setSelectedAvatar(URL.createObjectURL(file));
            }}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="name" label="Nome" defaultValue={customer.name} required />
          <Input name="document" label="CPF/CNPJ" defaultValue={formatDocument(customer.document)} />
          <Input name="phone" label="Telefone" defaultValue={customer.phone ?? ""} required />
        </div>
      </div>
      <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}

function AddressesPanel({
  addresses,
  isPending,
  onSubmit,
}: {
  addresses: CustomerAddress[];
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(addresses[0] ?? null);

  return (
    <section className="grid gap-6">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Endereços de entrega</h2>
          <button
            type="button"
            onClick={() => setSelectedAddress(null)}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Adicionar novo endereço
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <button
              key={address.id}
              type="button"
              onClick={() => setSelectedAddress(address)}
              className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300"
            >
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{address.label}</span>
              {address.isDefault ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Padrão</span> : null}
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {address.street}, {address.number} - {address.neighborhood}
              </p>
              <p className="text-sm text-slate-500">{address.city}/{address.state} - {address.zipCode}</p>
            </button>
          ))}
        </div>
      </div>

      <form action={onSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">{selectedAddress ? "Editar endereço" : "Adicionar endereço"}</h3>
        <input type="hidden" name="addressId" value={selectedAddress?.id ?? ""} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Input name="label" label="Nome do endereço" defaultValue={selectedAddress?.label ?? "Casa"} />
          <Input name="zipCode" label="CEP" defaultValue={selectedAddress?.zipCode ?? ""} required />
          <Input name="street" label="Rua / Avenida" defaultValue={selectedAddress?.street ?? ""} className="md:col-span-2" required />
          <Input name="number" label="Número" defaultValue={selectedAddress?.number ?? ""} required />
          <Input name="complement" label="Complemento" defaultValue={selectedAddress?.complement ?? ""} />
          <Input name="neighborhood" label="Bairro" defaultValue={selectedAddress?.neighborhood ?? ""} required />
          <Input name="city" label="Cidade" defaultValue={selectedAddress?.city ?? ""} required />
          <Input name="state" label="Estado" defaultValue={selectedAddress?.state ?? ""} required />
        </div>
        <label className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
          <input
            type="checkbox"
            name="isDefault"
            value="true"
            defaultChecked={selectedAddress?.isDefault ?? true}
            className="size-4 rounded border-emerald-300"
          />
          Ativar como endereço padrão
        </label>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar e definir como padrão"}
        </button>
      </form>
    </section>
  );
}

function SecurityPanel({
  storeSlug,
  isPending,
  onPasswordSubmit,
}: {
  storeSlug: string;
  isPending: boolean;
  onPasswordSubmit: (formData: FormData) => void;
}) {
  const deleteAction = deleteCustomerAccountAction.bind(null, storeSlug);

  return (
    <section className="grid gap-6">
      <form action={onPasswordSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Alterar senha</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Input name="currentPassword" label="Senha atual" type="password" required />
          <Input name="password" label="Nova senha" type="password" required />
          <Input name="confirmPassword" label="Confirmar senha" type="password" required />
        </div>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white" disabled={isPending}>
          {isPending ? "Salvando..." : "Alterar senha"}
        </button>
      </form>

      <form action={deleteAction} className="rounded-[2rem] border border-red-200 bg-red-50 p-6">
        <h2 className="text-2xl font-black text-red-900">Apagar conta</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700">
          Esta ação remove seu acesso de comprador nesta loja. Seus pedidos permanecem no histórico da loja para controle da compra.
        </p>
        <button className="mt-5 rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white">
          Apagar minha conta
        </button>
      </form>
    </section>
  );
}

function Input({
  name,
  label,
  defaultValue = "",
  type = "text",
  required,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function Avatar({ name, avatarUrl, accentColor }: { name: string; avatarUrl: string; accentColor: string }) {
  if (avatarUrl) {
    return <Image src={avatarUrl} alt={name} width={72} height={72} unoptimized className="size-18 rounded-full object-cover" />;
  }

  return (
    <span className="grid size-18 place-items-center rounded-full text-2xl font-black text-white" style={{ background: accentColor }}>
      {name.charAt(0)}
    </span>
  );
}

function buildAddresses(customer: DashboardCustomer, value: unknown): CustomerAddress[] {
  const saved = Array.isArray(value) ? value.filter(isCustomerAddress) : [];

  if (saved.length > 0) {
    return saved;
  }

  if (!customer.zipCode || !customer.street || !customer.number) {
    return [];
  }

  return [
    {
      id: "default",
      label: "Endereço principal",
      zipCode: customer.zipCode,
      street: customer.street,
      number: customer.number,
      complement: customer.complement ?? "",
      neighborhood: customer.neighborhood ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      isDefault: true,
    },
  ];
}

function isCustomerAddress(value: unknown): value is CustomerAddress {
  return typeof value === "object" && value !== null && "id" in value && "zipCode" in value;
}

function parseNotes(value: string | null): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function matchesFilter(order: DashboardOrder, filter: OrderFilter) {
  const groups: Record<OrderFilter, OrderStatus[]> = {
    pending: ["PENDING"],
    confirmed: ["PAID"],
    preparing: ["PROCESSING"],
    shipping: ["SHIPPED"],
    completed: ["DELIVERED"],
    canceled: ["CANCELED", "REFUNDED"],
  };

  return groups[filter].includes(order.status);
}

function canCustomerCancelOrder(order: DashboardOrder) {
  return (
    order.status !== "CANCELED" &&
    order.status !== "DELIVERED" &&
    order.status !== "SHIPPED" &&
    order.status !== "REFUNDED"
  );
}

function getOrderStatus(status: OrderStatus) {
  const statusMap: Record<OrderStatus, { label: string; className: string }> = {
    PENDING: { label: "Aguardando pagamento", className: "bg-amber-50 text-amber-700" },
    PAID: { label: "Pedido confirmado", className: "bg-emerald-50 text-emerald-700" },
    PROCESSING: { label: "Em preparação", className: "bg-sky-50 text-sky-700" },
    SHIPPED: { label: "Em transporte", className: "bg-indigo-50 text-indigo-700" },
    DELIVERED: { label: "Concluído", className: "bg-emerald-50 text-emerald-700" },
    CANCELED: { label: "Cancelado", className: "bg-red-50 text-red-700" },
    REFUNDED: { label: "Reembolsado", className: "bg-slate-100 text-slate-600" },
  };

  return statusMap[status];
}

function formatPayment(method: string | null) {
  if (method?.endsWith(":pix")) {
    return "Pix";
  }

  if (method?.endsWith(":card")) {
    return "Cartão";
  }

  const paymentMap: Record<string, string> = {
    customizado: "Pagamento em mãos",
    "pix-deposito": "Pix Depósito",
    paypal: "PayPal Checkout",
    pagseguro: "PagSeguro",
    "mercado-pago": "Mercado Pago",
    dinheiro: "Dinheiro",
  };

  return method ? (paymentMap[method] ?? method) : "A definir";
}

function formatDocument(value: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(value / 1024, 1).toFixed(0)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReturnStatus(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: "Solicitada",
    APPROVED: "Aprovada",
    REJECTED: "Recusada",
    SHIPPED_BY_CUSTOMER: "Enviada pelo comprador",
    RECEIVED_BY_MERCHANT: "Recebimento validado pela loja",
    REFUND_REQUESTED: "Estorno solicitado",
    REFUNDED: "Estornada",
    EXPIRED: "Prazo expirado",
  };

  return labels[status] ?? status;
}

function isActiveReturnStatus(status: string) {
  return ACTIVE_RETURN_STATUSES.includes(status as (typeof ACTIVE_RETURN_STATUSES)[number]);
}

function isCompletedReturnStatus(status: string) {
  return COMPLETED_RETURN_STATUSES.includes(status as (typeof COMPLETED_RETURN_STATUSES)[number]);
}

function getCompletedReturnFromOrder(order: DashboardOrder) {
  if (
    order.status !== "REFUNDED" &&
    order.paymentStatus !== "estornado" &&
    order.paymentStatus !== "estorno_solicitado" &&
    typeof order.integrationStatus.returnRefundedAt !== "string" &&
    typeof order.integrationStatus.returnReceivedAt !== "string" &&
    typeof order.integrationStatus.refund !== "object"
  ) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: "order-return-completed",
    status: order.status === "REFUNDED" ||
      order.paymentStatus === "estornado" ||
      typeof order.integrationStatus.returnRefundedAt === "string" ||
      typeof order.integrationStatus.refund === "object"
      ? "REFUNDED"
      : "RECEIVED_BY_MERCHANT",
    reason: "Devolução concluída",
    otherReason: null,
    observation: null,
    merchantCarrier: null,
    merchantPostCode: null,
    merchantReturnAddress: null,
    merchantPostDeadline: null,
    merchantPackageInstructions: null,
    merchantNotes: typeof order.integrationStatus.returnReceivedMessage === "string"
      ? order.integrationStatus.returnReceivedMessage
      : null,
    customerTrackingCode: null,
    customerReturnNote: null,
    refundStatus: typeof order.integrationStatus.returnRefund === "object" && order.integrationStatus.returnRefund !== null
      ? String((order.integrationStatus.returnRefund as Record<string, unknown>).status ?? "")
      : null,
    refundMessage: typeof order.integrationStatus.returnRefund === "object" && order.integrationStatus.returnRefund !== null
      ? String((order.integrationStatus.returnRefund as Record<string, unknown>).message ?? "")
      : null,
    createdAt: typeof order.integrationStatus.returnReceivedAt === "string"
      ? order.integrationStatus.returnReceivedAt
      : now,
    updatedAt: typeof order.integrationStatus.returnRefundedAt === "string"
      ? order.integrationStatus.returnRefundedAt
      : typeof order.integrationStatus.returnReceivedAt === "string"
        ? order.integrationStatus.returnReceivedAt
        : now,
    attachments: [],
  } satisfies DashboardOrder["returnRequests"][number];
}

function formatRefundStatus(status: string | null) {
  const labels: Record<string, string> = {
    refunded: "Estornado",
    requested: "Estorno solicitado",
    failed: "Falha no estorno",
  };

  return status ? labels[status] ?? status : "Estorno";
}

function getPixPayment(value: Record<string, unknown>) {
  const pixPayment = value.pixPayment;

  if (!pixPayment || typeof pixPayment !== "object" || Array.isArray(pixPayment)) {
    return null;
  }

  const payload = pixPayment as {
    qrCodeDataUrl?: unknown;
    copiaECola?: unknown;
  };

  if (typeof payload.qrCodeDataUrl !== "string" || typeof payload.copiaECola !== "string") {
    return null;
  }

  return {
    qrCodeDataUrl: payload.qrCodeDataUrl,
    copiaECola: payload.copiaECola,
  };
}

function getDeliveryConfirmation(value: Record<string, unknown>) {
  const delivery = value.deliveryConfirmation;

  if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) {
    return null;
  }

  const data = delivery as Record<string, unknown>;

  if (
    typeof data.deliveredDate !== "string" ||
    typeof data.deliveredTime !== "string" ||
    typeof data.receivedBy !== "string"
  ) {
    return null;
  }

  return {
    deliveredDate: data.deliveredDate,
    deliveredTime: data.deliveredTime,
    receivedBy: data.receivedBy,
  };
}

function getReturnWindow(order: DashboardOrder) {
  const deliveredAt = getOrderDeliveredAt(order);

  if (!deliveredAt) {
    return {
      isOpen: false,
      isExpired: false,
      deadlineLabel: "",
    };
  }

  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(23, 59, 59, 999);

  return {
    isOpen: Date.now() <= deadline.getTime(),
    isExpired: Date.now() > deadline.getTime(),
    deadlineLabel: deadline.toLocaleDateString("pt-BR"),
  };
}

function getReturnPostingWindow(approvedAt: string) {
  const start = new Date(approvedAt);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + 3);

  const remainingMs = Math.max(deadline.getTime() - Date.now(), 0);
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return {
    deadlineLabel: deadline.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    remainingLabel: `${days} dia(s) e ${hours} hora(s)`,
  };
}

function getOrderDeliveredAt(order: DashboardOrder) {
  const delivery = getDeliveryConfirmation(order.integrationStatus);

  if (delivery) {
    const deliveredAt = new Date(`${delivery.deliveredDate}T${delivery.deliveredTime || "00:00"}`);

    if (!Number.isNaN(deliveredAt.getTime())) {
      return deliveredAt;
    }
  }

  const customerDeliveredAt = order.integrationStatus.customerDeliveredAt;

  if (typeof customerDeliveredAt === "string") {
    const deliveredAt = new Date(customerDeliveredAt);

    if (!Number.isNaN(deliveredAt.getTime())) {
      return deliveredAt;
    }
  }

  return null;
}
