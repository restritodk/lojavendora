export function SubscriptionBlockedPanel({
  planName,
  daysOverdue,
}: {
  planName: string;
  daysOverdue: number;
}) {
  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-3xl text-red-700">
        !
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-red-600">
        Assinatura bloqueada
      </p>
      <h1 className="mt-3 text-3xl font-black text-slate-950">
        Regularize o plano para continuar
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600">
        O plano <strong>{planName}</strong> está vencido há {daysOverdue} dia(s).
        Após o período de tolerância, o painel fica bloqueado até a confirmação do pagamento.
      </p>
      <a
        href="/dashboard/pagamentos-faturas"
        className="mt-7 inline-flex rounded-full bg-[#17293f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]"
      >
        Pagar agora
      </a>
    </section>
  );
}
