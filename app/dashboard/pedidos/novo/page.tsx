import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { ManualOrderForm } from "./manual-order-form";

export default async function NewOrderPage() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  const [customers, products] = store
    ? await Promise.all([
        prisma.customer.findMany({
          where: { storeId: store.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            zipCode: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
          },
        }),
        prisma.product.findMany({
          where: {
            storeId: store.id,
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            allowOutOfStock: true,
            imageUrl: true,
          },
        }),
      ])
    : [[], []];

  const formattedProducts = products.map((product) => ({
    ...product,
    price: product.price.toString(),
  }));

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Adicionar Pedido</span>
      </div>

      <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700">
          Pedido manual
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Criar pedido para cliente
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Selecione o cliente, adicione produtos, informe entrega e pagamento.
          O pedido será salvo na loja e o estoque dos produtos será abatido.
        </p>
      </header>

      <ManualOrderForm customers={customers} products={formattedProducts} />
    </DashboardShell>
  );
}
