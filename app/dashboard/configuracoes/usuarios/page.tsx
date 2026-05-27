import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UpgradePlanCard } from "@/components/dashboard/upgrade-plan-card";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { canActivateStaffUser } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import {
  getStoreAccessContext,
  hasStorePermission,
  normalizePermissions,
  requireStorePermission,
  STORE_PERMISSIONS,
} from "@/lib/store-permissions";
import { SettingsShell } from "../settings-shell";
import { StaffUsersPanel } from "./staff-users-panel";

const PAGE_SIZE = 10;

export default async function StoreUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);

  if (!store) {
    return (
      <DashboardShell description="Painel do lojista">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Loja não encontrada.
        </div>
      </DashboardShell>
    );
  }

  await requireStorePermission(user.id, store.id, "usuarios");
  const access = await getStoreAccessContext(user.id, store.id);
  const where = {
    storeId: store.id,
    ...(query
      ? {
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };
  const [staffUsers, totalUsers, userLimit] = await Promise.all([
    prisma.storeStaffUser.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.storeStaffUser.count({ where }),
    canActivateStaffUser(store.id),
  ]);
  const totalPages = Math.max(Math.ceil(totalUsers / PAGE_SIZE), 1);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Usuários e Permissões</span>
      </div>

      <SettingsShell active="usuarios">
        {!userLimit.allowed ? (
          <UpgradePlanCard
            title="Limite de usuários atingido"
            description={userLimit.reason ?? "Você atingiu o limite de usuários/admins do seu plano."}
            requiredPlan="Loja Mais"
            benefits={["Mais usuários no painel", "Permissões por função", "Equipe com acessos separados"]}
            icon="👥"
          />
        ) : null}
        <div className={!userLimit.allowed ? "mt-6" : ""}>
          <StaffUsersPanel
            canManage={hasStorePermission(access, "usuarios") && userLimit.allowed}
            query={query}
            currentPage={currentPage}
            totalPages={totalPages}
            totalUsers={totalUsers}
            permissions={STORE_PERMISSIONS.map((permission) => ({
              id: permission.id,
              label: permission.label,
              description: permission.description,
            }))}
            users={staffUsers.map((staffUser) => ({
              id: staffUser.id,
              name: staffUser.user.name ?? "Usuário sem nome",
              email: staffUser.user.email,
              level: staffUser.level,
              active: staffUser.active,
              permissions: normalizePermissions(staffUser.permissions),
              createdAt: staffUser.createdAt.toLocaleDateString("pt-BR"),
            }))}
          />
        </div>
      </SettingsShell>
    </DashboardShell>
  );
}

