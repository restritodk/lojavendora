import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { getStoreNotificationSettings } from "@/lib/store-notifications";
import { SettingsShell } from "../settings-shell";
import { NotificationSettingsForm } from "./notification-settings-form";

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }

  const settings = await getStoreNotificationSettings(store.id);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Notificações</span>
      </div>

      <SettingsShell active="notificacoes">
        <NotificationSettingsForm settings={settings} />
      </SettingsShell>
    </DashboardShell>
  );
}
