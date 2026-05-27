import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";
import { PaymentMethodsPanel } from "./payment-methods-panel";

export default async function PaymentMethodsPage() {
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

  await requireStorePermission(user.id, store.id, "pagamentos");

  const [subscription, paymentSettings] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        storeId: store.id,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          select: { slug: true },
        },
      },
    }),
    prisma.storeAdvancedSetting.findMany({
      where: {
        storeId: store.id,
        featureId: { startsWith: "payment:" },
      },
      select: {
        featureId: true,
        active: true,
        values: true,
      },
    }),
  ]);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Formas de Pagamento</span>
      </div>

      <PaymentMethodsPanel
        planSlug={subscription?.plan.slug ?? "loja-gratis"}
        initialSettings={paymentSettings.map((setting) => ({
          featureId: setting.featureId,
          active: setting.active,
          values: normalizeValues(setting.values),
        }))}
      />
    </DashboardShell>
  );
}

function normalizeValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string | string[]] => {
    const [, entryValue] = entry;

    return (
      typeof entryValue === "string" ||
      (Array.isArray(entryValue) &&
        entryValue.every((item) => typeof item === "string"))
    );
  });

  return Object.fromEntries(entries);
}
