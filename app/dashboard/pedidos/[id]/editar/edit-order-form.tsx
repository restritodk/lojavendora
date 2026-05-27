"use client";

import { useMemo, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  updateOrderDetailsAction,
  type EditOrderResult,
} from "./actions";

type EditOrderData = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  shippingMethod: string | null;
  trackingCode: string | null;
  shippingDeadline: string | null;
  shippingAddress: string;
  recipientName: string;
  notes: string | null;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export function EditOrderForm({ order }: { order: EditOrderData }) {
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus ?? "");
  const [feedback, setFeedback] = useState<EditOrderResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const updateAction = updateOrderDetailsAction.bind(null, order.id);
  const currentStep = useMemo(() => getStatusStep(status), [status]);

  function submit(formData: FormData) {
    formData.set("status", status);
    formData.set("paymentStatus", paymentStatus);

    startTransition(() => {
      void updateAction(formData).then((result) => {
        setFeedback(result);
      });
    });
  }

  function quickStatus(nextStatus: string, nextPaymentStatus?: string) {
    setStatus(nextStatus);
    if (nextPaymentStatus) {
      setPaymentStatus(nextPaymentStatus);
    }
  }

  return (
    <form action={submit} className="grid gap-6">
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600"
        >
          Gerar etiqueta
        </button>
        <button
          type="button"
          className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600"
        >
          Gerar declaração de conteúdo
        </button>
        <button
          type="button"
          className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600"
        >
          Imprimir
        </button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title={`Situação do Pedido: ${formatStatus(status)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              Pedido: <strong>{order.number}</strong> - {order.customer.name}
            </span>
            <span>
              Data: <strong>{formatDate(order.createdAt)}</strong>
            </span>
          </div>

          <StatusTimeline currentStep={currentStep} />

          <div className="mt-8 grid gap-4 text-sm md:grid-cols-[180px_1fr] md:items-center">
            <Label>Método de pagamento:</Label>
            <Select
              name="paymentMethod"
              defaultValue={order.paymentMethod ?? ""}
              options={[
                ["", "Selecione"],
                ["pix", "Pix"],
                ["cartao", "Cartão"],
                ["boleto", "Boleto"],
                ["dinheiro", "Pagamento em mãos"],
                ["manual", "Pagamento manual"],
              ]}
            />

            <Label>Valor total do pedido:</Label>
            <strong>{formatCurrency(order.total)}</strong>

            <Label>Status do pedido:</Label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
            >
              <option value="PENDING">⌛ Aguardando pagamento</option>
              <option value="PROCESSING">◌ Analisando pagamento</option>
              <option value="PAID">✓ Aguardando envio</option>
              <option value="SHIPPED">➤ Enviado</option>
              <option value="DELIVERED">✓ Concluído</option>
              <option value="CANCELED">⊗ Cancelado</option>
            </select>

            <Label>Status informativo:</Label>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
            >
              <option value="">--- Nenhum</option>
              <option value="pendente">Não houve tentativa de pagamento</option>
              <option value="processando">Orçamento/Pagamento em análise</option>
              <option value="pago">Pagamento confirmado</option>
              <option value="cancelado">Pagamento recusado ou cancelado</option>
            </select>

            <Label>Origem do pedido:</Label>
            <span>Loja virtual / painel do lojista</span>

            <Label>Deduzir estoque:</Label>
            <span>Sim</span>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel title="Pagamento">
            <SummaryLine label="Método de pagamento" value={formatPayment(order.paymentMethod)} />
            <SummaryLine label="Total produtos" value={formatCurrency(order.subtotal)} />
            <SummaryLine label="Frete" value={formatCurrency(order.shippingFee)} />
            {order.discount > 0 ? (
              <SummaryLine label="Desconto" value={formatCurrency(order.discount)} />
            ) : null}
            <button
              type="button"
              onClick={() => quickStatus("PAID", "pago")}
              disabled={status !== "PENDING"}
              className="mx-auto mt-4 block rounded bg-indigo-600 px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              ✓ Confirmar Pagamento
            </button>
            <div className="mt-5 border-t border-slate-100 pt-4 text-right font-black">
              Total do Pedido: {formatCurrency(order.total)}
            </div>
          </Panel>

          <Panel title="Entrega">
            <SummaryLine label="Método de entrega" value={order.shippingMethod || "A definir"} />
            <Field
              name="trackingCode"
              label="Código rastreio"
              defaultValue={order.trackingCode ?? ""}
            />
            <Field
              name="shippingDeadline"
              label="Prazo de envio"
              defaultValue={order.shippingDeadline ?? ""}
            />
            <SummaryLine label="Destinatário" value={order.recipientName} />
            <p className="text-center text-sm text-slate-500">{order.shippingAddress}</p>
            <input
              type="hidden"
              name="shippingMethod"
              value={order.shippingMethod ?? ""}
            />
            <button
              type="button"
              onClick={() => quickStatus("SHIPPED")}
              disabled={status !== "PAID"}
              className="mx-auto mt-4 block rounded bg-indigo-600 px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              ✓ Confirmar Envio
            </button>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Produtos">
          <div className="overflow-hidden rounded border border-slate-100">
            <div className="grid grid-cols-[70px_1fr_120px] bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
              <span>Qtd.</span>
              <span>Produto(s)</span>
              <span className="text-right">Valor</span>
            </div>
            {order.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[70px_1fr_120px] border-t border-slate-100 px-4 py-3 text-sm"
              >
                <span>{item.quantity}</span>
                <span>{item.name}</span>
                <strong className="text-right">{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right text-sm">
            <p>Quantidade produtos: {order.items.length}</p>
            <p className="font-black">Total Produtos: {formatCurrency(order.subtotal)}</p>
          </div>
        </Panel>

        <Panel title="Cliente">
          <div className="grid gap-3 text-sm">
            <SummaryLine label="Código" value={order.customer.document || "Não informado"} />
            <SummaryLine label="CPF" value={order.customer.document || "Não informado"} />
            <SummaryLine label="Nome" value={order.customer.name} />
            <SummaryLine label="E-mail" value={order.customer.email} />
            <SummaryLine label="Telefone" value={order.customer.phone || "Não informado"} />
          </div>
        </Panel>
      </section>

      <Panel title="Observações e Anexos">
        <textarea
          name="notes"
          defaultValue={order.notes ?? ""}
          rows={4}
          placeholder="Escreva aqui suas observações"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-600"
        />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Histórico de Atualizações do Pedido">
          <div className="grid gap-4 border-l-2 border-cyan-200 pl-4 text-sm text-slate-500">
            <HistoryLine date={order.createdAt} text="Pedido criado." />
            <HistoryLine date={order.createdAt} text={`Status atual: ${formatStatus(status)}.`} />
            <HistoryLine date={order.createdAt} text={`Pagamento: ${formatSubStatus(paymentStatus)}.`} />
          </div>
        </Panel>

        <Panel title="Acompanhamento do envio do pedido">
          <p className="text-sm text-slate-500">
            {order.trackingCode
              ? `Código de rastreio: ${order.trackingCode}`
              : "Não existe histórico de rastreio para este pedido no momento."}
          </p>
        </Panel>
      </section>

      <div className="sticky bottom-4 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <button
          disabled={isPending}
          className="rounded bg-indigo-600 px-6 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "✓ Atualizar pedido"}
        </button>
      </div>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Pedido atualizado com sucesso!"
          errorTitle="Não foi possível atualizar o pedido"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-700">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatusTimeline({ currentStep }: { currentStep: number }) {
  const steps = [
    { icon: "⌛", label: "Aguardando" },
    { icon: "▣", label: "Pagamento" },
    { icon: "◴", label: "Separação" },
    { icon: "▭", label: "Enviado" },
    { icon: "☑", label: "Concluído" },
  ];

  return (
    <div className="mt-8 flex items-center justify-between gap-3 overflow-x-auto">
      {steps.map((step, index) => (
        <div key={step.label} className="flex shrink-0 items-center gap-3">
          <div
            className={`grid size-14 place-items-center text-4xl ${
              index <= currentStep ? "text-emerald-500" : "text-slate-400"
            }`}
            title={step.label}
          >
            {step.icon}
          </div>
          {index < steps.length - 1 ? (
            <span className="text-3xl font-black text-slate-300">›</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-700 md:text-right">{children}</span>;
}

function Select({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: Array<[string, string]>;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-cyan-600"
      />
    </label>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-1 text-sm">
      <span className="text-right font-semibold text-slate-700">{label}:</span>
      <span className="text-slate-500">{value}</span>
    </div>
  );
}

function HistoryLine({ date, text }: { date: string; text: string }) {
  return (
    <div>
      <strong className="block text-xs text-slate-400">{formatDate(date)}</strong>
      <span>{text}</span>
    </div>
  );
}

function getStatusStep(status: string) {
  const steps: Record<string, number> = {
    PENDING: 0,
    PROCESSING: 1,
    PAID: 2,
    SHIPPED: 3,
    DELIVERED: 4,
    CANCELED: 0,
  };

  return steps[status] ?? 0;
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Aguardando pagamento",
    PROCESSING: "Analisando pagamento",
    PAID: "Aguardando envio",
    SHIPPED: "Pedido em trânsito",
    DELIVERED: "Pedido entregue",
    CANCELED: "Cancelado",
  };

  return labels[status] ?? "Aguardando pagamento";
}

function formatSubStatus(status: string | null) {
  const labels: Record<string, string> = {
    pendente: "Aguardando pagamento",
    processando: "Analisando pagamento",
    pago: "Pagamento confirmado",
    cancelado: "Cancelado",
  };

  return status ? labels[status] ?? status : "Nenhum";
}

function formatPayment(method: string | null) {
  const labels: Record<string, string> = {
    pix: "Pix",
    cartao: "Cartão",
    boleto: "Boleto",
    dinheiro: "Pagamento em mãos",
    manual: "Pagamento manual",
  };

  return method ? labels[method] ?? method : "Não informado";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
