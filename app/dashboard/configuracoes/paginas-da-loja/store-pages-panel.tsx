"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  deleteStorePageAction,
  saveStorePageAction,
  type StorePageActionResult,
} from "./actions";

type EditableStorePage = {
  id: string;
  code: number;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  active: boolean;
};

type SystemPage = {
  code: number;
  title: string;
  link: string;
};

export function StorePagesPanel({
  storeSlug,
  pages,
  systemPages,
}: {
  storeSlug: string;
  pages: EditableStorePage[];
  systemPages: SystemPage[];
}) {
  const [selectedPage, setSelectedPage] = useState<EditableStorePage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<StorePageActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const storePath = `/store/${storeSlug}`;

  function openCreateModal() {
    setSelectedPage(null);
    setIsModalOpen(true);
  }

  function openEditModal(page: EditableStorePage) {
    setSelectedPage(page);
    setIsModalOpen(true);
  }

  function savePage(formData: FormData) {
    startTransition(async () => {
      const result = await saveStorePageAction(selectedPage?.id ?? null, formData);
      setFeedback(result);

      if (result.type === "success") {
        setIsModalOpen(false);
      }
    });
  }

  function deletePage(pageId: string) {
    if (!confirm("Deseja excluir esta página da loja?")) {
      return;
    }

    startTransition(async () => {
      setFeedback(await deleteStorePageAction(pageId));
    });
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <PanelHeader icon="▣" title="Páginas adicionais" />
        <InfoBar text="Crie páginas personalizadas para sua loja virtual. Elas aparecem apenas no site desta loja." />
        <div className="flex justify-end px-5 py-4">
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded bg-sky-600 px-5 py-2 text-sm font-black text-white transition hover:bg-sky-700"
          >
            + Adicionar Página
          </button>
        </div>
        <div className="overflow-x-auto px-5 pb-6">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="py-3">Código</th>
                <th className="py-3">Nome</th>
                <th className="py-3">Link</th>
                <th className="py-3">Ativo</th>
                <th className="w-36 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.length > 0 ? (
                pages.map((page) => (
                  <tr key={page.id} className="hover:bg-sky-50/60">
                    <td className="py-3 font-bold text-cyan-700">{page.code}</td>
                    <td className="py-3 font-semibold text-slate-700">{page.title}</td>
                    <td className="py-3 text-slate-500">/pagina/{page.slug}</td>
                    <td className="py-3">{page.active ? "Sim" : "Não"}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`${storePath}/pagina/${page.slug}`}
                          target="_blank"
                          className="rounded border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-white"
                        >
                          Visualizar
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(page)}
                          className="rounded border border-cyan-200 px-3 py-1.5 text-xs font-black text-cyan-700 hover:bg-cyan-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePage(page.id)}
                          disabled={isPending}
                          className="rounded border border-red-200 px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhuma página adicional criada para esta loja.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <PanelHeader icon="▣" title="Páginas do sistema" />
        <InfoBar text="Páginas principais que o site desta loja já possui. Elas são informativas e seguem o funcionamento do sistema." />
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="py-3">Código</th>
                <th className="py-3">Página</th>
                <th className="py-3">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {systemPages.map((page) => (
                <tr key={page.code}>
                  <td className="py-3 font-bold text-cyan-700">{page.code}</td>
                  <td className="py-3 text-slate-700">{page.title}</td>
                  <td className="py-3 text-slate-500">{page.link}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <StorePageModal
          page={selectedPage}
          isPending={isPending}
          onClose={() => setIsModalOpen(false)}
          onSave={savePage}
        />
      ) : null}

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Página salva!"
          errorTitle="Não foi possível salvar"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function StorePageModal({
  page,
  isPending,
  onClose,
  onSave,
}: {
  page: EditableStorePage | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  const [content, setContent] = useState(page?.content ?? "");
  const [active, setActive] = useState(page?.active ?? true);
  const preview = useMemo(() => content.replace(/\n/g, "<br />"), [content]);

  function wrapContent(before: string, after = before) {
    const selection = window.getSelection()?.toString();
    setContent((current) => `${current}${before}${selection || "texto"}${after}`);
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 px-4 py-5">
      <form action={onSave} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between bg-[#dddddd] px-5 py-3">
          <h2 className="text-lg font-black text-slate-700">
            {page ? "Editar Página" : "Adicionar Página"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-3xl font-black leading-none text-slate-600"
          >
            ×
          </button>
        </header>

        <div className="shrink-0">
          <InfoBar compact text="Crie ou personalize páginas da sua loja aplicando o estilo e conteúdo que desejar." />
        </div>

        <div className="grid gap-4 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="title"
              label="Título da página"
              help="Nome exibido no painel e no topo da página pública."
              defaultValue={page?.title ?? ""}
              required
            />
            <Field
              name="slug"
              label="Link da página"
              help="Endereço usado no site. Exemplo: quem-somos gera /pagina/quem-somos."
              defaultValue={page?.slug ?? ""}
              placeholder="quem-somos"
            />
          </div>
          <Field
            name="description"
            label="Descrição"
            help="Resumo opcional da página, usado para orientar o comprador."
            defaultValue={page?.description ?? ""}
          />

          <div className="grid gap-2">
            <FieldLabel
              label="Página ativa"
              help="Quando estiver em Sim, compradores podem acessar esta página no site da loja."
            />
            <input type="hidden" name="active" value={String(active)} />
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Sim</span>
              <button
                type="button"
                onClick={() => setActive((current) => !current)}
                className={`relative h-6 w-14 rounded-full transition ${
                  active ? "bg-cyan-100" : "bg-red-100"
                }`}
              >
                <span
                  className={`absolute top-1 size-4 rounded-full transition ${
                    active ? "left-2 bg-cyan-700" : "left-8 bg-red-600"
                  }`}
                />
              </button>
              <span>Não</span>
            </div>
          </div>

          <div className="grid gap-2">
            <FieldLabel
              label="Conteúdo"
              help="Texto principal exibido na página pública. Use os botões para aplicar formatação simples."
            />
            <div className="rounded border border-slate-200">
              <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-2 text-xs">
                <ToolbarButton label="B" onClick={() => wrapContent("<strong>", "</strong>")} />
                <ToolbarButton label="I" onClick={() => wrapContent("<em>", "</em>")} />
                <ToolbarButton label="Título" onClick={() => wrapContent("<h2>", "</h2>")} />
                <ToolbarButton label="Lista" onClick={() => wrapContent("<ul><li>", "</li></ul>")} />
              </div>
              <textarea
                name="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
                rows={7}
                className="w-full resize-y px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-black uppercase text-slate-400">Prévia</p>
              <div
                className="prose prose-slate max-h-28 max-w-none overflow-y-auto text-sm leading-6 text-slate-700"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-600 px-6 py-2.5 text-sm font-black text-white"
          >
            Fechar
          </button>
          <button
            disabled={isPending}
            className="rounded bg-green-600 px-6 py-2.5 text-sm font-black text-white disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "✓ Salvar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function PanelHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-[#d9d9d9] px-5 py-3">
      <span className="text-xl text-slate-700">{icon}</span>
      <h1 className="font-black text-slate-700">{title}</h1>
    </header>
  );
}

function InfoBar({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`m-3 flex items-center gap-4 rounded border-l-4 border-cyan-400 bg-slate-50 px-4 ${compact ? "py-2" : "py-3"}`}>
      <span className={`${compact ? "size-8 text-xl" : "size-10 text-2xl"} grid shrink-0 place-items-center rounded-full bg-cyan-400 font-black italic text-white`}>
        i
      </span>
      <p className={`${compact ? "text-xs leading-5" : "text-sm leading-6"} text-slate-500`}>{text}</p>
      <span className="ml-auto text-xl font-black text-slate-600">×</span>
    </div>
  );
}

function Field({
  label,
  help,
  name,
  defaultValue,
  placeholder,
  required = false,
}: {
  label: string;
  help: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel label={label} help={help} />
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-11 rounded border border-slate-200 px-3 outline-none focus:border-cyan-600"
      />
    </label>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
      {label}
      <span className="group relative inline-grid size-5 cursor-help place-items-center rounded-full border border-cyan-200 bg-cyan-50 text-[11px] font-black text-cyan-700">
        ?
        <span className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-72 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold leading-5 text-white shadow-xl group-hover:block">
          {help}
        </span>
      </span>
    </span>
  );
}

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-slate-200 bg-white px-3 py-1 font-black text-slate-600 hover:bg-slate-100"
    >
      {label}
    </button>
  );
}
