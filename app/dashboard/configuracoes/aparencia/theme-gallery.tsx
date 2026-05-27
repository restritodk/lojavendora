"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  applyStoreThemeAction,
  type ApplyThemeResult,
} from "./actions";

type ThemeOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  businessCategoryName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bannerTitle: string;
  bannerSubtitle: string;
  defaultCategories: string[];
  isActive: boolean;
};

export function ThemeGallery({
  themes,
  storePath,
}: {
  themes: ThemeOption[];
  storePath: string;
}) {
  const [feedback, setFeedback] = useState<ApplyThemeResult | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(
    themes.find((theme) => theme.isActive) ?? themes[0],
  );
  const [isPending, startTransition] = useTransition();

  function applyTheme(theme: ThemeOption) {
    startTransition(() => {
      void applyStoreThemeAction(theme.id).then((result) => {
        setFeedback(result);

        if (result.type === "success") {
          setSelectedTheme(theme);
        }
      });
    });
  }

  if (!selectedTheme) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">
          Nenhum tema disponível
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Cadastre templates de loja para liberar a seleção de aparência.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
              Aparência da loja
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Escolha o tema ideal para sua vitrine
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Selecione um layout profissional para aplicar na loja pública. O
              tema escolhido define a estrutura visual da vitrine e as cores
              principais da marca.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={storePath}
                target="_blank"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Visualizar loja
              </Link>
              <button
                type="button"
                onClick={() => applyTheme(selectedTheme)}
                disabled={isPending || selectedTheme.isActive}
                className="rounded-xl bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedTheme.isActive
                  ? "Tema ativo"
                  : isPending
                    ? "Aplicando..."
                    : "Aplicar tema selecionado"}
              </button>
            </div>
          </div>

          <FeaturedPreview theme={selectedTheme} />
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedTheme.id === theme.id}
            isPending={isPending}
            onSelect={() => setSelectedTheme(theme)}
            onApply={() => applyTheme(theme)}
          />
        ))}
      </section>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Tema aplicado com sucesso!"
          errorTitle="Não foi possível aplicar o tema"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function ThemeCard({
  theme,
  isSelected,
  isPending,
  onSelect,
  onApply,
}: {
  theme: ThemeOption;
  isSelected: boolean;
  isPending: boolean;
  onSelect: () => void;
  onApply: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        isSelected ? "border-cyan-500 ring-4 ring-cyan-100" : "border-slate-200"
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <MiniPreview theme={theme} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                {theme.businessCategoryName}
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {theme.name}
              </h2>
            </div>
            {theme.isActive ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Ativo
              </span>
            ) : null}
          </div>
          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
            {theme.description ?? "Tema profissional pronto para usar na loja."}
          </p>
        </div>
      </button>
      <div className="border-t border-slate-100 p-5">
        <button
          type="button"
          onClick={onApply}
          disabled={isPending || theme.isActive}
          className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {theme.isActive ? "Tema em uso" : "Usar este tema"}
        </button>
      </div>
    </article>
  );
}

function FeaturedPreview({ theme }: { theme: ThemeOption }) {
  return (
    <div className="rounded-[2rem] bg-slate-100 p-4">
      <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl">
        <MiniPreview theme={theme} large />
        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Prévia selecionada
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {theme.name}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {theme.defaultCategories.slice(0, 4).map((category) => (
              <span
                key={category}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPreview({
  theme,
  large = false,
}: {
  theme: ThemeOption;
  large?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden bg-slate-100 ${large ? "h-80" : "h-56"}`}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-[10px] font-black text-white"
        style={{ background: theme.primaryColor }}
      >
        <span className="truncate">{theme.name}</span>
        <div className="hidden items-center gap-3 opacity-90 sm:flex">
          <span>Início</span>
          <span>Categorias</span>
          <span>Contato</span>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-1">🛒</span>
      </div>

      <div
        className={`p-4 ${large ? "grid gap-4 md:grid-cols-[1.1fr_0.9fr]" : "grid gap-3"}`}
        style={{ background: theme.secondaryColor }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p
            className="text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: theme.accentColor }}
          >
            {theme.businessCategoryName}
          </p>
          <h3 className={`${large ? "text-2xl" : "text-lg"} mt-2 font-black text-slate-950`}>
            {theme.bannerTitle}
          </h3>
          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">
            {theme.bannerSubtitle}
          </p>
          <div className="mt-4 flex gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-black text-white"
              style={{ background: theme.accentColor }}
            >
              Comprar agora
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
              Ver ofertas
            </span>
          </div>
        </div>

        <div
          className={`rounded-2xl bg-white/75 p-3 shadow-sm ${large ? "block" : "hidden"}`}
        >
          <div className="grid grid-cols-2 gap-2">
            {theme.defaultCategories.slice(0, 4).map((category) => (
              <div
                key={category}
                className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-slate-600 shadow-sm"
              >
                {category}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-3 bg-white p-4 ${large ? "pt-0" : "pt-1"}`}>
        {[0, 1, 2].map((item) => {
          const productName =
            theme.defaultCategories[item] ??
            ["Produto destaque", "Oferta especial", "Mais vendido"][item];

          return (
          <div key={item} className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
            <div
              className={`${large ? "h-20" : "h-10"} rounded-lg`}
              style={{
                background:
                  item === 1
                    ? `linear-gradient(135deg, ${theme.accentColor}, ${theme.primaryColor})`
                    : `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
              }}
            />
            <p className="mt-2 truncate text-[10px] font-black text-slate-700">
              {productName}
            </p>
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="text-[10px] font-black" style={{ color: theme.accentColor }}>
                R$ 99
              </span>
              <span
                className="h-2 w-8 rounded-full"
                style={{ background: theme.primaryColor }}
              />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
