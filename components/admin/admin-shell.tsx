import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { logoutAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";

export const adminMenuGroups = [
  {
    title: "Dashboard",
    href: "/admin",
  },
  {
    title: "Cadastro",
    items: [
      { label: "Clientes", href: "/admin/clientes" },
      { label: "Novo cliente", href: "/admin/clientes/novo" },
    ],
  },
  {
    title: "Relatórios",
    items: [
      { label: "Clientes em dia", href: "/admin/clientes?status=em-dia" },
      { label: "A vencer", href: "/admin/clientes?status=a-vencer" },
      { label: "Vendidos", href: "/admin/clientes?status=vendido" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { label: "Receitas", href: "/admin#financeiro" },
      { label: "Cobranças", href: "/admin#cobrancas" },
      { label: "Inadimplência", href: "/admin/clientes?status=inadimplente" },
      { label: "Notas e repasses", href: "/admin#repasses" },
    ],
  },
  {
    title: "Configuração",
    items: [
      { label: "Mercado Pago", href: "/admin/mercado-pago" },
      { label: "Planos", href: "/admin/planos" },
      { label: "Promoções", href: "/admin#promocoes" },
      { label: "Usuários admin", href: "/admin#usuarios-admin" },
    ],
  },
];

type AdminShellProps = {
  children: React.ReactNode;
};

export async function AdminShell({ children }: AdminShellProps) {
  const admin = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#ededed] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[300px_1fr]">
        <AdminSidebar
          email={admin.email}
          menuGroups={adminMenuGroups}
          logoutAction={logoutAction}
        />
        <section className="p-5 sm:p-8 lg:p-10">{children}</section>
      </div>
    </main>
  );
}
