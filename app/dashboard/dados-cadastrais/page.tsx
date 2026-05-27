import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import {
  STORE_BUSINESS_SEGMENTS,
  STORE_REGISTRATION_FEATURE_ID,
  normalizeStoreRegistrationValues,
} from "@/lib/store-registration";
import { StoreRegistrationForm } from "./store-registration-form";

export default async function StoreRegistrationPage() {
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

  const setting = await prisma.storeAdvancedSetting.findUnique({
    where: {
      storeId_featureId: {
        storeId: store.id,
        featureId: STORE_REGISTRATION_FEATURE_ID,
      },
    },
    select: { values: true },
  });
  const values = normalizeStoreRegistrationValues(setting?.values);

  return (
    <DashboardShell description="Painel do lojista">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="transition hover:text-[#17293f]">
          Início
        </Link>
        <span>/</span>
        <span className="font-bold text-cyan-700">Dados cadastrais</span>
      </div>

      <StoreRegistrationForm
        userEmail={user.email}
        store={{
          name: store.name,
          logoUrl: store.logoUrl,
        }}
        values={{
          ...values,
          email: user.email,
          logoUrl: values.logoUrl || store.logoUrl || "",
        }}
        businessSegments={STORE_BUSINESS_SEGMENTS}
      />
    </DashboardShell>
  );
}

