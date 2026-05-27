import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const STORE_PERMISSIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Visualizar resumo e atalhos do painel.",
    paths: ["/dashboard"],
  },
  {
    id: "clientes",
    label: "Clientes",
    description: "Cadastrar, listar e editar clientes.",
    paths: ["/dashboard/clientes"],
  },
  {
    id: "produtos",
    label: "Produtos",
    description: "Cadastrar, listar e editar produtos e categorias.",
    paths: ["/dashboard/produtos"],
  },
  {
    id: "pedidos",
    label: "Pedidos",
    description: "Criar, listar e gerenciar pedidos.",
    paths: ["/dashboard/pedidos"],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    description: "Acompanhar indicadores, vendas e exportações da loja.",
    paths: ["/dashboard/relatorios"],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    description: "Acessar configurações gerais da loja.",
    paths: ["/dashboard/configuracoes"],
  },
  {
    id: "pagamentos",
    label: "Formas de Pagamento",
    description: "Configurar meios de pagamento da loja.",
    paths: ["/dashboard/configuracoes/formas-de-pagamento"],
  },
  {
    id: "promocoes",
    label: "Promoções e Descontos",
    description: "Criar cupons, campanhas e regras promocionais.",
    paths: ["/dashboard/configuracoes/promocoes-descontos"],
  },
  {
    id: "usuarios",
    label: "Usuários e Permissões",
    description: "Gerenciar equipe e permissões do painel.",
    paths: ["/dashboard/configuracoes/usuarios"],
  },
  {
    id: "aplicativos",
    label: "Aplicativos",
    description: "Configurar integrações e aplicativos.",
    paths: ["/dashboard/configuracoes/aplicativos"],
  },
  {
    id: "notificacoes",
    label: "Notificações",
    description: "Gerenciar notificações e e-mails automáticos.",
    paths: ["/dashboard/notificacoes", "/dashboard/configuracoes/notificacoes", "/dashboard/configuracoes/emails"],
  },
] as const;

export type StorePermissionId = (typeof STORE_PERMISSIONS)[number]["id"];

export type StoreAccessContext = {
  storeId: string;
  ownerId: string;
  isOwner: boolean;
  permissions: StorePermissionId[];
};

export function getPermissionById(id: string) {
  return STORE_PERMISSIONS.find((permission) => permission.id === id);
}

export function normalizePermissions(value: unknown): StorePermissionId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is StorePermissionId =>
    typeof item === "string" && STORE_PERMISSIONS.some((permission) => permission.id === item),
  );
}

export function hasStorePermission(access: StoreAccessContext | null, permissionId: StorePermissionId) {
  return Boolean(access?.isOwner || access?.permissions.includes(permissionId));
}

export async function getStoreAccessContext(userId: string, storeId: string): Promise<StoreAccessContext | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { ownerId: true },
  });

  if (!store) {
    return null;
  }

  if (store.ownerId === userId) {
    return {
      storeId,
      ownerId: store.ownerId,
      isOwner: true,
      permissions: STORE_PERMISSIONS.map((permission) => permission.id),
    };
  }

  const staffUser = await prisma.storeStaffUser.findFirst({
    where: {
      storeId,
      userId,
      active: true,
    },
    select: {
      permissions: true,
    },
  });

  if (!staffUser) {
    return null;
  }

  return {
    storeId,
    ownerId: store.ownerId,
    isOwner: false,
    permissions: normalizePermissions(staffUser.permissions),
  };
}

export async function requireStorePermission(userId: string, storeId: string, permissionId: StorePermissionId) {
  const access = await getStoreAccessContext(userId, storeId);

  if (!hasStorePermission(access, permissionId)) {
    redirect("/dashboard?error=permission-denied");
  }

  return access;
}

