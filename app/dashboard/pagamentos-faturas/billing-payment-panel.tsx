"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { payPlatformInvoiceAction, type BillingPaymentResult } from "./actions";

type BillingPaymentPanelProps = {
  invoiceId: string;
  disabled?: boolean;
};

export function BillingPaymentPanel({ invoiceId, disabled }: BillingPaymentPanelProps) {
  const [feedback, setFeedback] = useState<BillingPaymentResult | null>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function payPix() {
    const formData = new FormData();
    formData.set("invoiceId", invoiceId);
    formData.set("method", "PIX");

    startTransition(() => {
      void payPlatformInvoiceAction(formData).then(setFeedback);
    });
  }

  function payCard(formData: FormData) {
    formData.set("invoiceId", invoiceId);
    formData.set("method", "CARD");

    startTransition(() => {
      void payPlatformInvoiceAction(formData).then((result) => {
        setFeedback(result);
        if (result.type === "success") {
          setIsCardOpen(false);
        }
      });
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={payPix}
          disabled={disabled || isPending}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isPending ? "Gerando..." : "Pagar com Pix"}
        </button>
        <button
          type="button"
          onClick={() => setIsCardOpen((value) => !value)}
          disabled={disabled || isPending}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-60"
        >
          Pagar com cartão
        </button>
      </div>

      {isCardOpen ? (
        <form action={payCard} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold leading-5 text-slate-500">
            Informe o token gerado pelo checkout Mercado Pago da plataforma. As credenciais usadas aqui são do proprietário, não da loja.
          </p>
          <label className="grid gap-1">
            <span className="text-xs font-black text-slate-600">Token do cartão</span>
            <input
              name="cardToken"
              required
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-black text-slate-600">Bandeira</span>
              <input
                name="paymentMethodId"
                placeholder="visa"
                required
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-black text-slate-600">Parcelas</span>
              <input
                name="installments"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-black text-slate-600">CPF/CNPJ</span>
              <input
                name="payerDocument"
                required
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#17293f] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isPending ? "Processando..." : "Confirmar pagamento"}
          </button>
        </form>
      ) : null}

      {feedback ? (
        <ActionResultModal
          result={{ type: feedback.type === "error" ? "error" : "success", message: feedback.message }}
          successTitle={feedback.type === "success" ? "Pagamento aprovado!" : "Pagamento criado"}
          errorTitle="Não foi possível pagar"
          onClose={() => setFeedback(null)}
        >
          {feedback.pixQrCode || feedback.pixQrCodeBase64 || feedback.pixTicketUrl ? (
            <div className="mt-4 grid gap-3">
              {feedback.pixQrCodeBase64 ? (
                <Image
                  src={`data:image/png;base64,${feedback.pixQrCodeBase64}`}
                  alt="QR Code Pix"
                  width={192}
                  height={192}
                  unoptimized
                  className="mx-auto size-48 rounded-xl border border-slate-200 bg-white p-2"
                />
              ) : null}
              {feedback.pixQrCode ? (
                <textarea
                  readOnly
                  value={feedback.pixQrCode}
                  className="min-h-24 rounded-xl border border-slate-200 p-3 text-xs text-slate-600"
                />
              ) : null}
              {feedback.pixTicketUrl ? (
                <a
                  href={feedback.pixTicketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center text-sm font-black text-cyan-700 underline"
                >
                  Abrir pagamento Pix
                </a>
              ) : null}
            </div>
          ) : null}
        </ActionResultModal>
      ) : null}
    </div>
  );
}
