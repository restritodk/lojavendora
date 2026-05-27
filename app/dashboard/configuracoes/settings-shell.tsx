import Link from "next/link";

const settingsItems = [
  {
    icon: "⚙️",
    title: "Configurações Gerais",
    href: "/dashboard/configuracoes/gerais",
  },
  {
    icon: "✉️",
    title: "Envio de E-mails",
    href: "/dashboard/configuracoes/emails",
  },
  {
    icon: "🎛️",
    title: "Funções Avançadas",
    href: "/dashboard/configuracoes/funcoes-avancadas",
  },
  {
    icon: "▦",
    title: "Aplicativos",
    href: "/dashboard/configuracoes/aplicativos",
  },
  {
    icon: "📄",
    title: "Páginas da Loja",
    href: "/dashboard/configuracoes/paginas-da-loja",
  },
  {
    icon: "💬",
    title: "Notificações",
    href: "/dashboard/configuracoes/notificacoes",
  },
];

export function SettingsShell({
  active,
  children,
}: {
  active:
    | "gerais"
    | "emails"
    | "avancadas"
    | "aplicativos"
    | "paginas"
    | "notificacoes"
    | "usuarios";
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="grid content-start gap-2">
        {settingsItems.map((item) => {
          const isActive =
            (active === "gerais" && item.href.endsWith("/gerais")) ||
            (active === "emails" && item.href.endsWith("/emails")) ||
            (active === "avancadas" && item.href.endsWith("/funcoes-avancadas")) ||
            (active === "aplicativos" && item.href.endsWith("/aplicativos")) ||
            (active === "paginas" && item.href.endsWith("/paginas-da-loja")) ||
            (active === "notificacoes" && item.href.endsWith("/notificacoes")) ||
            (active === "usuarios" && item.href.endsWith("/usuarios"));

          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-sm font-black shadow-sm transition ${
                isActive
                  ? "border-[#17293f] bg-[#17293f] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </aside>

      <div>{children}</div>
    </div>
  );
}
