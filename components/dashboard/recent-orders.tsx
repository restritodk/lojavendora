const orders = [
  ["#1028", "Marina Costa", "Pago", "R$ 289,90"],
  ["#1027", "João Lima", "Processando", "R$ 149,00"],
  ["#1026", "Ana Martins", "Enviado", "R$ 519,90"],
];

export function RecentOrders() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pedidos recentes</h2>
        <a href="#" className="text-sm font-semibold text-[#17293f]">
          Ver todos
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        {orders.map(([code, customer, status, total]) => (
          <div
            key={code}
            className="grid grid-cols-2 gap-4 border-b border-slate-200 px-4 py-4 text-sm last:border-0 md:grid-cols-4"
          >
            <span className="font-bold">{code}</span>
            <span className="text-slate-600">{customer}</span>
            <span className="text-slate-500">{status}</span>
            <span className="font-semibold">{total}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
