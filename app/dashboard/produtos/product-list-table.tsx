"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  deactivateProductAction,
  deleteProductAction,
  duplicateProductAction,
  type ProductListActionResult,
} from "./actions";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  stock: number;
  criticalStock: number;
  status: string;
  showOnSite: boolean;
  isLaunch: boolean;
  freightType: string | null;
  showOnHome: boolean;
  categoryName: string | null;
  customCode: string | null;
  createdAt: string;
};

type ProductListTableProps = {
  products: ProductRow[];
  filters: ReadonlyArray<{ id: string; label: string }>;
  activeFilter: string;
  search: string;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  storePath: string;
};

export function ProductListTable({
  products,
  filters,
  activeFilter,
  search,
  currentPage,
  totalPages,
  totalProducts,
  storePath,
}: ProductListTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ProductListActionResult | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
    action: "delete" | "deactivate" | "duplicate";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function createHref(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    return `/dashboard/produtos?${params.toString()}`;
  }

  function handleSearch(formData: FormData) {
    const value = String(formData.get("q") ?? "").trim();
    router.push(createHref({ q: value || null, page: null }));
  }

  function runAction() {
    if (!confirmTarget) return;

    const target = confirmTarget;
    setConfirmTarget(null);
    setOpenProductId(null);

    startTransition(() => {
      const action =
        target.action === "delete"
          ? deleteProductAction
          : target.action === "deactivate"
            ? deactivateProductAction
            : duplicateProductAction;

      void action(target.id).then((result) => {
        setFeedback(result);
        router.refresh();
      });
    });
  }

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-4">
          <div>
            <h1 className="font-black text-slate-950">Listagem de Produtos</h1>
            <p className="text-sm text-slate-500">
              Gerencie os produtos cadastrados na sua loja.
            </p>
          </div>

          <Link
            href="/dashboard/produtos/novo"
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700"
          >
            + Adicionar Produto
          </Link>
        </header>

        <div className="border-b border-slate-100 px-5 pt-4">
          <div className="flex gap-6 overflow-x-auto text-sm font-bold text-slate-500">
            {filters.map((filter) => (
              <Link
                key={filter.id}
                href={createHref({
                  filtro: filter.id === "todos" ? null : filter.id,
                  page: null,
                })}
                className={`border-b-2 px-1 pb-3 whitespace-nowrap transition ${activeFilter === filter.id
                    ? "border-sky-600 text-sky-700"
                    : "border-transparent hover:text-slate-900"
                  }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-slate-500">
            {totalProducts} produto(s) encontrados.
          </p>
          <form action={handleSearch} className="relative w-full sm:w-72">
            <input
              name="q"
              defaultValue={search}
              placeholder="O que você procura?"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#17293f]"
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              title="Pesquisar"
            >
              🔎
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-t border-slate-100 text-sm">
            <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-5 py-3">
                  <input type="checkbox" className="size-4 accent-[#17293f]" />
                </th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-20 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product, index) => (
                <tr key={product.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <input type="checkbox" className="size-4 accent-[#17293f]" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-sky-700">
                    {product.customCode || codeFromDate(product.createdAt, index)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-14 place-items-center overflow-hidden rounded-xl bg-slate-100">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={56}
                            height={56}
                            unoptimized
                            className="size-14 object-cover"
                          />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.categoryName ?? "Sem categoria"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {product.oldPrice ? (
                      <p className="text-xs text-slate-400 line-through">
                        De: {formatCurrency(product.oldPrice)}
                      </p>
                    ) : null}
                    <p className="font-bold text-slate-900">
                      Por: {formatCurrency(product.price)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>Crítico: {product.criticalStock}</p>
                    <p>Atual: {product.stock}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
                      <span
                        className={`rounded-full px-2 py-1 ${product.status === "ACTIVE" && product.showOnSite
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                          }`}
                      >
                        {product.status === "ACTIVE" && product.showOnSite
                          ? "Ativo"
                          : "Desativado"}
                      </span>
                      {product.isLaunch ? (
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
                          Lançamento
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenProductId((current) =>
                          current === product.id ? null : product.id,
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm transition hover:bg-slate-100"
                      title="Ações"
                    >
                      ⚙
                    </button>
                    {openProductId === product.id ? (
                      <ActionMenu
                        product={product}
                        storePath={storePath}
                        onClose={() => setOpenProductId(null)}
                        onConfirm={setConfirmTarget}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={createHref({
                page: String(Math.max(currentPage - 1, 1)),
              })}
              className={`rounded-xl border px-4 py-2 text-sm font-bold ${currentPage <= 1
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
            >
              Anterior
            </Link>
            <Link
              href={createHref({
                page: String(Math.min(currentPage + 1, totalPages)),
              })}
              className={`rounded-xl border px-4 py-2 text-sm font-bold ${currentPage >= totalPages
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
            >
              Próxima
            </Link>
          </div>
        </footer>
      </section>

      {confirmTarget ? (
        <ConfirmActionModal
          target={confirmTarget}
          isPending={isPending}
          onClose={() => setConfirmTarget(null)}
          onConfirm={runAction}
        />
      ) : null}
      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Produto atualizado com sucesso!"
          errorTitle="Não foi possível atualizar o produto"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function ActionMenu({
  product,
  storePath,
  onClose,
  onConfirm,
}: {
  product: ProductRow;
  storePath: string;
  onClose: () => void;
  onConfirm: (target: {
    id: string;
    name: string;
    action: "delete" | "deactivate" | "duplicate";
  }) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-4 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-sm shadow-2xl"
    >
      <Link
        href={`${storePath}/produto/${product.slug}`}
        target="_blank"
        className="block px-4 py-3 text-slate-700 hover:bg-slate-50"
      >
        Visualizar
      </Link>
      <Link
        href={`/dashboard/produtos/${product.id}/editar`}
        className="block px-4 py-3 text-slate-700 hover:bg-slate-50"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={() =>
          onConfirm({ id: product.id, name: product.name, action: "duplicate" })
        }
        className="block w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50"
      >
        Duplicar
      </button>
      <button
        type="button"
        onClick={() =>
          onConfirm({ id: product.id, name: product.name, action: "delete" })
        }
        className="block w-full px-4 py-3 text-left text-red-600 hover:bg-red-50"
      >
        Excluir
      </button>
      <button
        type="button"
        onClick={() =>
          onConfirm({
            id: product.id,
            name: product.name,
            action: "deactivate",
          })
        }
        className="block w-full px-4 py-3 text-left text-amber-700 hover:bg-amber-50"
      >
        Desativar
      </button>
    </div>
  );
}

function ConfirmActionModal({
  target,
  isPending,
  onClose,
  onConfirm,
}: {
  target: {
    name: string;
    action: "delete" | "deactivate" | "duplicate";
  };
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const label =
    target.action === "delete"
      ? "excluir"
      : target.action === "deactivate"
        ? "desativar"
        : "duplicar";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-sky-50 text-2xl">
          ⚙
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          Confirmar ação?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Deseja {label} o produto <strong>{target.name}</strong>?
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
          >
            {isPending ? "Processando..." : "Sim"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function codeFromDate(createdAt: string, index: number) {
  const timestamp = new Date(createdAt).getTime().toString().slice(-6);
  return `${timestamp}${index}`;
}
