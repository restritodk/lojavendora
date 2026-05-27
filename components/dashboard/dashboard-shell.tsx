import Link from "next/link";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { SubscriptionBlockedPanel } from "@/components/dashboard/subscription-blocked-panel";
import { getCurrentUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { getStoreAccessContext, hasStorePermission, type StorePermissionId } from "@/lib/store-permissions";
import {
  ensureInitialStoreNotifications,
  getDashboardNotifications,
} from "@/lib/store-notifications";

type DashboardShellProps = {
  children: React.ReactNode;
  description: string;
};

const menuGroups = [
  {
    label: "Clientes",
    items: [
      {
        icon: "👥",
        title: "Adicionar Cliente",
        description: "Cadastre clientes manualmente em sua loja.",
        href: "/dashboard/clientes/novo",
      },
      {
        icon: "📋",
        title: "Listar Clientes",
        description: "Localize e altere informações dos clientes cadastrados.",
        href: "/dashboard/clientes",
      },
      {
        icon: "🤝",
        title: "Afiliados",
        description: "Crie parceiros de vendas transformando clientes em afiliados.",
        href: "#",
      },
    ],
  },
  {
    label: "Produtos",
    wide: true,
    items: [
      {
        icon: "🏷️",
        title: "Adicionar Produto",
        description: "Cadastre novos produtos em sua loja virtual.",
        href: "/dashboard/produtos/novo",
      },
      {
        icon: "📦",
        title: "Listar Produtos",
        description: "Localize e altere as informações dos produtos cadastrados.",
        href: "/dashboard/produtos",
      },
      {
        icon: "☰",
        title: "Categorias de Produto",
        description: "Crie e edite categorias responsáveis por organizar seus produtos.",
        href: "/dashboard/produtos/categorias",
      },
      {
        icon: "🏬",
        title: "Marketplace",
        description: "Visualize produtos cadastrados em marketplaces.",
        href: "#",
      },
    ],
  },
  {
    label: "Pedidos",
    items: [
      {
        icon: "🧾",
        title: "Adicionar Pedido",
        description: "Crie pedidos de forma manual para seus clientes.",
        href: "/dashboard/pedidos/novo",
      },
      {
        icon: "📑",
        title: "Listar Pedidos",
        description: "Localize e gerencie todos os dados de cada pedido feito.",
        href: "/dashboard/pedidos",
      },
      {
        icon: "🛒",
        title: "Carrinho Abandonado",
        description: "Veja pedidos não finalizados com chance de recuperação.",
        href: "/dashboard/pedidos/carrinho-abandonado",
      },
      {
        icon: "🧮",
        title: "Nota Fiscal de Produto",
        description: "Automatize a emissão das notas fiscais dos produtos vendidos.",
        href: "/dashboard/pedidos/notas-fiscais",
      },
    ],
  },
  {
    label: "Configurações",
    wide: true,
    items: [
      {
        icon: "🎨",
        title: "Aparência da Loja",
        description: "Dê um visual único para deixar sua loja mais profissional.",
        href: "/dashboard/configuracoes/aparencia",
      },
      {
        icon: "⚙️",
        title: "Configurações Gerais",
        description: "Ajuste opções essenciais para sua operação.",
        href: "/dashboard/configuracoes/gerais",
      },
      {
        icon: "🎛️",
        title: "Funções Avançadas",
        description: "Ative recursos especiais para personalizar a operação.",
        href: "/dashboard/configuracoes/funcoes-avancadas",
      },
      {
        icon: "▦",
        title: "Aplicativos",
        description: "Conecte integrações de marketing, logística e atendimento.",
        href: "/dashboard/configuracoes/aplicativos",
      },
      {
        icon: "🚚",
        title: "Formas de Envio",
        description: "Ative e personalize formas de envio para suas vendas.",
        href: "#",
      },
      {
        icon: "💳",
        title: "Formas de Pagamento",
        description: "Configure pagamentos usados pelos seus clientes.",
        href: "/dashboard/configuracoes/formas-de-pagamento",
      },
      {
        icon: "✉️",
        title: "E-mails Automáticos",
        description: "Automatize mensagens enviadas aos compradores.",
        href: "/dashboard/configuracoes/emails",
      },
      {
        icon: "👤",
        title: "Usuários e Permissões",
        description: "Controle acessos da sua equipe dentro do painel.",
        href: "/dashboard/configuracoes/usuarios",
        permission: "usuarios",
      },
      {
        icon: "📈",
        title: "Relatórios",
        description: "Acompanhe vendas, visitas e desempenho da loja.",
        href: "/dashboard/relatorios",
        permission: "relatorios",
      },
      {
        icon: "🎟️",
        title: "Promoções e Descontos",
        description: "Crie cupons, campanhas e ofertas especiais.",
        href: "/dashboard/configuracoes/promocoes-descontos",
        permission: "configuracoes",
      },
    ],
  },
];

export async function DashboardShell({ children, description }: DashboardShellProps) {
  const user = await getCurrentUser();
  const store = user ? await getUserPrimaryStore(user.id) : null;
  const access = user && store ? await getStoreAccessContext(user.id, store.id) : null;
  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeMenuItem(item, access)),
    }))
    .filter((group) => group.items.length > 0);
  const notificationData = store
    ? await getNotificationsForHeader(store.id, store.name)
    : { unreadCount: 0, notifications: [] };
  const subscriptionCheck = store ? await checkStoreSubscription(store.id) : null;
  const isBillingPage = description.includes("Pagamentos e Faturas");
  const shouldBlockPanel = Boolean(subscriptionCheck?.isBlocked && !isBillingPage);

  return (
    <main className="min-h-screen bg-[#ededed] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-[#0f1f31] bg-[#17293f] text-white shadow-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="leading-none">
              <span className="block text-2xl font-black tracking-tight">
                Vendora
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {description}
              </span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {visibleMenuGroups.map((group) => (
                <div key={group.label} className="group relative">
                  <button className="rounded-xl px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10 hover:text-white">
                    {group.label} ▾
                  </button>

                  {group.label === "Configurações" ? (
                    <ConfigurationDropdown items={group.items} />
                  ) : (
                    <div
                      className={`invisible absolute left-0 top-full pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 ${
                        group.wide ? "w-[520px]" : "w-[340px]"
                      }`}
                    >
                      <div
                        className={`grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl ${
                          group.wide ? "grid-cols-2" : "grid-cols-1"
                        }`}
                      >
                        {group.items.map((item) => (
                          <a
                            key={item.title}
                            href={item.href}
                            className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-100"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-50 text-base">
                              {item.icon}
                            </span>
                            <span>
                              <span className="block text-sm font-black text-cyan-800">
                                {item.title}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {item.description}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="hidden flex-1 justify-end gap-3 md:flex">
            <label className="relative max-w-xs flex-1">
              <input
                placeholder="O que você procura?"
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0f1f31] px-4 pr-10 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>
            </label>

            <a
              href={store ? `/store/${store.subdomain}` : "#"}
              target={store ? "_blank" : undefined}
              rel={store ? "noreferrer" : undefined}
              className="grid size-10 place-items-center rounded-xl bg-white/10 text-sm transition hover:bg-white/20"
              title="Loja"
            >
              🏬
            </a>
            <NotificationBell
              unreadCount={notificationData.unreadCount}
              notifications={notificationData.notifications}
            />
            <ProfileDropdown
              storeName={store?.name ?? "Minha loja"}
              userEmail={user?.email ?? ""}
            />
            <a
              href="#"
              className="flex h-10 items-center rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/20"
            >
              Ajuda ?
            </a>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-white/10 px-5 py-3 text-sm font-bold text-slate-200 lg:hidden">
          {visibleMenuGroups.map((group) => (
            <a
              key={group.label}
              href="#"
              className="rounded-full bg-white/10 px-4 py-2 whitespace-nowrap"
            >
              {group.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
        {shouldBlockPanel && subscriptionCheck ? (
          <SubscriptionBlockedPanel
            planName={subscriptionCheck.planName}
            daysOverdue={subscriptionCheck.daysOverdue}
          />
        ) : (
          children
        )}
      </section>
    </main>
  );
}

function canSeeMenuItem(
  item: { href: string; permission?: StorePermissionId },
  access: Awaited<ReturnType<typeof getStoreAccessContext>>,
) {
  if (item.href === "#") {
    return true;
  }

  const permission = item.permission ?? getMenuPermission(item.href);
  return permission ? hasStorePermission(access, permission) : true;
}

function getMenuPermission(href: string): StorePermissionId | null {
  if (href.startsWith("/dashboard/clientes")) return "clientes";
  if (href.startsWith("/dashboard/produtos")) return "produtos";
  if (href.startsWith("/dashboard/pedidos")) return "pedidos";
  if (href.startsWith("/dashboard/relatorios")) return "relatorios";
  if (href.startsWith("/dashboard/notificacoes")) return "notificacoes";
  if (href.startsWith("/dashboard/configuracoes/formas-de-pagamento")) return "pagamentos";
  if (href.startsWith("/dashboard/configuracoes/aplicativos")) return "aplicativos";
  if (href.startsWith("/dashboard/configuracoes/notificacoes")) return "notificacoes";
  if (href.startsWith("/dashboard/configuracoes/emails")) return "notificacoes";
  if (href.startsWith("/dashboard/configuracoes/usuarios")) return "usuarios";
  if (href.startsWith("/dashboard/configuracoes")) return "configuracoes";

  return null;
}

function ConfigurationDropdown({
  items,
}: {
  items: Array<{
    icon: string;
    title: string;
    description: string;
    href: string;
    permission?: StorePermissionId;
  }>;
}) {
  const featuredTitles = new Set([
    "Aparência da Loja",
    "Configurações Gerais",
    "Formas de Envio",
    "Formas de Pagamento",
  ]);
  const featuredItems = items.filter((item) => featuredTitles.has(item.title));
  const secondaryItems = items.filter((item) => !featuredTitles.has(item.title));

  return (
    <div className="invisible absolute left-0 top-full w-[560px] pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
        <div className="grid gap-x-8 gap-y-4 p-5 md:grid-cols-2">
          {featuredItems.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="flex gap-3 rounded-lg p-2 transition hover:bg-slate-50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan-50 text-xl">
                {item.icon}
              </span>
              <span>
                <span className="block text-sm font-black text-cyan-800">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {item.description}
                </span>
              </span>
            </a>
          ))}
        </div>

        <div className="grid border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm font-semibold text-cyan-800 md:grid-cols-2">
          {secondaryItems.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="flex items-center gap-2 rounded px-2 py-2 transition hover:bg-white"
            >
              <span className="text-cyan-500">•</span>
              <span>{item.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileDropdown({
  storeName,
  userEmail,
}: {
  storeName: string;
  userEmail: string;
}) {
  const items = [
    {
      icon: "🧾",
      title: "Dados cadastrais",
      href: "/dashboard/dados-cadastrais",
    },
    {
      icon: "💳",
      title: "Pagamentos e Faturas",
      href: "/dashboard/pagamentos-faturas",
    },
    {
      icon: "🔒",
      title: "Alterar senha",
      href: "/dashboard/alterar-senha",
    },
    {
      icon: "🔄",
      title: "Atualizar Sistemas",
      href: "#",
    },
    {
      icon: "🚪",
      title: "Sair",
      href: "/logout",
    },
  ];

  return (
    <div className="group relative">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-xl bg-white/10 text-sm transition hover:bg-white/20"
        title="Conta"
      >
        👤
      </button>
      <div className="invisible absolute right-0 top-full z-50 w-64 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
          <div className="bg-cyan-700 px-4 py-3 text-white">
            <p className="truncate text-sm font-black">{storeName}</p>
            {userEmail ? (
              <p className="mt-1 truncate text-xs font-semibold text-cyan-100">{userEmail}</p>
            ) : null}
          </div>
          <div className="grid py-2">
            {items.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-cyan-800 transition hover:bg-slate-50"
              >
                <span className="grid size-7 place-items-center text-base">{item.icon}</span>
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function getNotificationsForHeader(storeId: string, storeName: string) {
  await ensureInitialStoreNotifications(storeId, storeName);
  return getDashboardNotifications(storeId);
}
