import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { EditCustomerForm } from "./edit-customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    notFound();
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      storeId: store.id,
    },
    include: {
      orders: {
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          items: true,
        },
      },
      _count: {
        select: {
          orders: {
            where: { storeId: store.id },
          },
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const totalSpent = customer.orders.reduce(
    (total, order) => total + Number(order.total),
    0,
  );

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <Link href="/dashboard/clientes" className="transition hover:text-[#17293f]">
          Listagem de Clientes
        </Link>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Editar Cliente</span>
        <span>/</span>
        <span className="font-bold text-cyan-700">{customer.name}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <EditCustomerForm customer={customer} />

        <aside className="grid h-fit gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Histórico de Pedidos</h2>
            <p className="mt-2 text-sm text-slate-500">
              Tudo sobre os pedidos feitos pelo comprador.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total de pedidos</p>
                <strong className="mt-1 block text-2xl">{customer._count.orders}</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total comprado</p>
                <strong className="mt-1 block text-2xl">
                  {totalSpent.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </strong>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {customer.orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                  Nenhum pedido feito por este comprador ainda.
                </div>
              ) : (
                customer.orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <strong>#{order.number}</strong>
                      <span className="text-sm font-bold text-[#17293f]">
                        {Number(order.total).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {order.status} • {order.createdAt.toLocaleDateString("pt-BR")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.items.length} item(ns)
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Ações rápidas</h2>
            <div className="mt-5 grid gap-3">
              <button className="rounded-2xl bg-[#17293f] px-4 py-3 text-sm font-black text-white">
                Criar Pedido
              </button>
              <Link
                href={`/store/${store.subdomain}/login`}
                target="_blank"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Login como cliente
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}
