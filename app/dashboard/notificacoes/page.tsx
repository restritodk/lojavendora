import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import {
  ensureInitialStoreNotifications,
  markStoreNotificationsAsRead,
} from "@/lib/store-notifications";

export default async function DashboardNotificationsPage() {
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

  await ensureInitialStoreNotifications(store.id, store.name);

  const notifications = await prisma.storeNotification.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      icon: true,
      title: true,
      message: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });

  await markStoreNotificationsAsRead(store.id);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Notificações</span>
      </div>

      <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-[#d9d9d9] px-5 py-3">
          <h1 className="font-black text-slate-700">NOTIFICAÇÕES</h1>
        </header>

        <div className="divide-y divide-slate-100 p-5">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.href || "/dashboard/notificacoes"}
                className="flex gap-5 py-4 transition hover:bg-slate-50"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded bg-slate-600 text-2xl text-white">
                  {notification.icon}
                </span>
                <span>
                  <span className="block text-sm font-black text-cyan-700">
                    {notification.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    {notification.message}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {formatDate(notification.createdAt)}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <div className="py-10 text-center text-slate-500">
              Nenhuma notificação para esta loja.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
