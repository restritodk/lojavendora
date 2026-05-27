import "server-only";
import { randomUUID } from "crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const notificationDefinitions = [
  {
    type: "new-customer",
    label: "Novo cadastro na loja",
    help: "Avise quando um comprador for cadastrado na loja.",
    icon: "✉️",
    defaultActive: true,
  },
  {
    type: "order-above",
    label: "Pedido efetuado acima de",
    help: "Avise quando um pedido ultrapassar o valor informado.",
    icon: "💰",
    hasThreshold: true,
    defaultThreshold: "0",
    defaultActive: false,
  },
  {
    type: "payment-approved",
    label: "Pagamento do pedido aprovado",
    help: "Avise quando um pedido tiver pagamento confirmado.",
    icon: "✅",
    defaultActive: true,
  },
  {
    type: "order-delivered",
    label: "Pedido entregue ao cliente",
    help: "Avise quando um pedido for marcado como entregue.",
    icon: "🏆",
    defaultActive: true,
  },
  {
    type: "critical-stock",
    label: "Estoque crítico",
    help: "Avise quando algum produto chegar ao estoque crítico.",
    icon: "📦",
    defaultActive: true,
  },
  {
    type: "visits-10",
    label: "Sua loja alcançou 10 acessos",
    help: "Avise quando a loja alcançar 10 acessos.",
    icon: "👁️",
    defaultActive: false,
  },
  {
    type: "visits-100",
    label: "Sua loja alcançou 100 acessos",
    help: "Avise quando a loja alcançar 100 acessos.",
    icon: "👁️",
    defaultActive: false,
  },
  {
    type: "visits-1000",
    label: "Sua loja alcançou 1000 acessos",
    help: "Avise quando a loja alcançar 1000 acessos.",
    icon: "👁️",
    defaultActive: false,
  },
] as const;

export type NotificationType = (typeof notificationDefinitions)[number]["type"];

export async function getStoreNotificationSettings(storeId: string) {
  const existingSettings = await prisma.storeNotificationSetting.findMany({
    where: { storeId },
    select: {
      type: true,
      active: true,
      threshold: true,
    },
  });
  const settingsMap = new Map(existingSettings.map((setting) => [setting.type, setting]));

  return notificationDefinitions.map((definition) => {
    const setting = settingsMap.get(definition.type);

    return {
      ...definition,
      active: setting?.active ?? definition.defaultActive,
      threshold: setting?.threshold
        ? String(setting.threshold)
        : "defaultThreshold" in definition
          ? definition.defaultThreshold ?? ""
          : "",
    };
  });
}

export async function getDashboardNotifications(storeId: string) {
  const [unreadCount, notifications] = await Promise.all([
    prisma.storeNotification.count({
      where: {
        storeId,
        readAt: null,
      },
    }),
    prisma.storeNotification.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        icon: true,
        title: true,
        message: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  return { unreadCount, notifications };
}

export async function ensureInitialStoreNotifications(storeId: string, storeName: string) {
  await Promise.all([
    createStoreNotification({
      storeId,
      type: "new-customer",
      title: "Você ganhou 15 dias grátis",
      message: "O seu primeiro bônus com a loja virtual já está ativo em sua conta.",
      icon: "✉️",
      eventKey: "welcome-bonus",
    }),
    createStoreNotification({
      storeId,
      type: "order-delivered",
      title: "Parabéns!",
      message: `Sua loja virtual ${storeName} foi criada com sucesso!`,
      icon: "🏆",
      eventKey: "store-created",
    }),
  ]);
}

export async function createStoreNotification({
  storeId,
  type,
  title,
  message,
  icon = "🔔",
  href,
  eventKey,
}: {
  storeId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  icon?: string;
  href?: string;
  eventKey?: string;
}) {
  const setting = await prisma.storeNotificationSetting.findUnique({
    where: {
      storeId_type: {
        storeId,
        type,
      },
    },
    select: { active: true },
  });
  const definition = notificationDefinitions.find((item) => item.type === type);
  const isActive = setting?.active ?? definition?.defaultActive ?? true;

  if (!isActive) {
    return null;
  }

  const resolvedEventKey = eventKey ?? `${type}:${randomUUID()}`;

  return prisma.storeNotification.upsert({
    where: {
      storeId_eventKey: {
        storeId,
        eventKey: resolvedEventKey,
      },
    },
    update: {},
    create: {
      storeId,
      type,
      title,
      message,
      icon,
      href,
      eventKey: resolvedEventKey,
    },
  });
}

export async function markStoreNotificationsAsRead(storeId: string) {
  await prisma.storeNotification.updateMany({
    where: {
      storeId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function shouldNotifyOrderAbove(storeId: string, total: number) {
  const setting = await prisma.storeNotificationSetting.findUnique({
    where: {
      storeId_type: {
        storeId,
        type: "order-above",
      },
    },
    select: {
      active: true,
      threshold: true,
    },
  });

  const active = setting?.active ?? false;
  const threshold = setting?.threshold ? Number(setting.threshold) : 0;

  return active && total >= threshold;
}

export function toNotificationMetadata(value: unknown): Prisma.InputJsonValue {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Prisma.InputJsonObject;
}
