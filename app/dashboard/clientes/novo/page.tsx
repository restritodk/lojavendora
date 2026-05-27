import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { NewCustomerForm } from "./customer-form";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span>Clientes</span>
        <span>/</span>
        <span className="font-bold text-[#17293f]">Adicionar Cliente</span>
      </div>

      <NewCustomerForm error={params.error} success={params.success} />
    </DashboardShell>
  );
}
