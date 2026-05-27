"use client";

import { PlanModal } from "@/components/admin/plan-modal";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanTableActionsProps = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  maxProducts: number | null;
  maxMonthlyVisits: number | null;
  maxOrders: number | null;
  maxStorageMb: number | null;
  maxUsers: number | null;
  isUnlimited: boolean;
  durationDays: number | null;
  releasedFeatures: string[];
  allowsCustomDomain: boolean;
  hasBasicFeatures: boolean;
  hasIntermediateFeatures: boolean;
  hasAdvancedFeatures: boolean;
  isActive: boolean;
  subscriptionsCount: number;
};

export function PlanTableActions({
  id,
  name,
  description,
  price,
  maxProducts,
  maxMonthlyVisits,
  maxOrders,
  maxStorageMb,
  maxUsers,
  isUnlimited,
  durationDays,
  releasedFeatures,
  allowsCustomDomain,
  hasBasicFeatures,
  hasIntermediateFeatures,
  hasAdvancedFeatures,
  isActive,
  subscriptionsCount,
}: PlanTableActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const canDelete = subscriptionsCount === 0;

  async function updateStatus() {
    setIsLoading(true);

    await fetch(`/api/admin/planos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    setIsLoading(false);
    router.refresh();
  }

  async function deletePlan() {
    if (!canDelete || !confirm("Deseja excluir este plano?")) {
      return;
    }

    setIsLoading(true);

    const response = await fetch(`/api/admin/planos/${id}`, {
      method: "DELETE",
    });

    setIsLoading(false);

    if (!response.ok) {
      alert("Não foi possível excluir o plano.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <PlanModal
        mode="edit"
        initialValues={{
          id,
          name,
          description,
          price,
          maxProducts,
          maxMonthlyVisits,
          maxOrders,
          maxStorageMb,
          maxUsers,
          isUnlimited,
          durationDays,
          releasedFeatures,
          allowsCustomDomain,
          hasBasicFeatures,
          hasIntermediateFeatures,
          hasAdvancedFeatures,
          isActive,
        }}
        trigger={
          <button
            type="button"
            title="Editar plano"
            className="grid size-10 place-items-center rounded-full bg-emerald-400 text-slate-950 transition hover:bg-emerald-300"
          >
            <span aria-hidden>✎</span>
            <span className="sr-only">Editar</span>
          </button>
        }
      />
      <button
        type="button"
        disabled={isLoading}
        onClick={updateStatus}
        title={isActive ? "Inativar plano" : "Ativar plano"}
        className="grid size-10 place-items-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        <span aria-hidden>{isActive ? "⏸" : "▶"}</span>
        <span className="sr-only">{isActive ? "Inativar" : "Ativar"}</span>
      </button>
      <button
        type="button"
        disabled={!canDelete || isLoading}
        onClick={deletePlan}
        title={
          canDelete
            ? "Excluir plano"
            : "Nao e possivel excluir plano com clientes vinculados"
        }
        className="grid size-10 place-items-center rounded-full border border-red-400/20 text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden>🗑</span>
        <span className="sr-only">Excluir</span>
      </button>
    </div>
  );
}
