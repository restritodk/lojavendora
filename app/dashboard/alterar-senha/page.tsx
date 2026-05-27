import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Alterar senha</span>
      </div>

      <ChangePasswordForm />
    </DashboardShell>
  );
}
