import Link from "next/link";

type DashboardNotification = {
  id: string;
  icon: string;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationBell({
  unreadCount,
  notifications,
}: {
  unreadCount: number;
  notifications: DashboardNotification[];
}) {
  return (
    <div className="group relative">
      <Link
        href="/dashboard/notificacoes"
        className="relative grid size-10 place-items-center rounded-xl bg-white/10 text-sm transition hover:bg-white/20"
        title="Notificações"
      >
        🔔
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>

      <div className="invisible absolute right-0 top-full z-[80] w-96 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-3 text-center text-sm font-black text-cyan-700">
            Notificações
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href || "/dashboard/notificacoes"}
                  className="flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded bg-slate-100 text-xl">
                    {notification.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-black text-cyan-700">
                      {notification.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {formatDate(notification.createdAt)}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Nenhuma notificação para esta loja.
              </div>
            )}
          </div>
          <Link
            href="/dashboard/notificacoes"
            className="block bg-slate-50 px-4 py-3 text-center text-sm font-black text-cyan-700 hover:bg-slate-100"
          >
            Ver todas as notificações
          </Link>
        </div>
      </div>
    </div>
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
