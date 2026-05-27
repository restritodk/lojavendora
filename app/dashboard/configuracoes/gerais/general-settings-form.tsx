"use client";

import { useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import {
  addStoreBannerAction,
  deleteStoreBannerAction,
  updateStoreBannerStatusAction,
  updateGeneralSettingsAction,
  type GeneralSettingsResult,
} from "./actions";

type StoreBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  active: boolean;
  sortOrder: number;
};

type StoreSettings = {
  name: string;
  subdomain: string;
  active: boolean;
  logoUrl: string | null;
  banners: StoreBanner[];
};

export function GeneralSettingsForm({ store }: { store: StoreSettings }) {
  const [feedback, setFeedback] = useState<GeneralSettingsResult | null>(null);
  const [active, setActive] = useState(store.active);
  const [bannerInputMode, setBannerInputMode] = useState<"upload" | "url">("upload");
  const [isPending, startTransition] = useTransition();
  const [isBannerPending, startBannerTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(() => {
      void updateGeneralSettingsAction(formData).then(setFeedback);
    });
  }

  function addBanner(formData: FormData) {
    startBannerTransition(() => {
      void addStoreBannerAction(formData).then(setFeedback);
    });
  }

  function updateBannerStatus(bannerId: string, nextActive: boolean) {
    startBannerTransition(() => {
      void updateStoreBannerStatusAction(bannerId, nextActive).then(setFeedback);
    });
  }

  function deleteBanner(bannerId: string) {
    startBannerTransition(() => {
      void deleteStoreBannerAction(bannerId).then(setFeedback);
    });
  }

  return (
    <div>
      <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-[#dddddd] px-5 py-4">
          <span className="text-xl">⚙️</span>
          <h1 className="font-bold text-slate-700">Configurações Gerais</h1>
        </header>

        <div className="border-l-4 border-cyan-500 bg-slate-50 px-5 py-4 text-sm text-slate-500">
          Defina as configurações principais da sua loja e sua forma de negócio.
        </div>

        <form id="general-settings-form" action={submit} className="grid gap-5 p-5">
          <div className="grid gap-2">
            <FieldLabel
              label="Loja Ativa"
              help="Indica se sua loja está ativa para receber visitas e pedidos no site do cliente."
            />
            <input type="hidden" name="active" value={String(active)} />
            <div className="flex items-center gap-3 text-sm">
              <span>Sim</span>
              <button
                type="button"
                onClick={() => setActive((current) => !current)}
                className={`relative inline-flex h-5 w-12 rounded-full ${
                  active ? "bg-cyan-100" : "bg-red-100"
                }`}
              >
                <span
                  className={`absolute top-1 size-3 rounded-full ${
                    active ? "left-1 bg-cyan-700" : "left-8 bg-red-600"
                  }`}
                />
              </button>
              <span>Não</span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Field
              name="name"
              label="Título da loja"
              help="Nome principal da sua loja. Ele aparece no painel e pode aparecer no cabeçalho do site."
              defaultValue={store.name}
              required
            />
            <Field
              label="Link temporário"
              help="Endereço temporário para acessar sua loja enquanto você ainda não usa um domínio próprio."
              value={`https://${store.subdomain}.lojavirtual.com.br`}
              readOnly
            />
            <Field
              name="logoUrl"
              label="URL da logo"
              help="Link da imagem da logo da loja. Use uma imagem em boa qualidade para fortalecer sua marca."
              defaultValue={store.logoUrl ?? ""}
            />
          </div>
        </form>

        <div className="mx-5 mb-5 rounded-2xl border border-slate-200 bg-slate-50">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-bold text-slate-700">Banners da loja</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Tamanho ideal: 1920 x 500 px. O site troca automaticamente a cada 3 segundos.
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
            {store.banners.length} banner(s)
          </span>
        </header>

        <div className="grid gap-5 p-4">
          <form action={addBanner} className="grid gap-4 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FieldLabel
                label="Adicionar banner"
                help="Use uma imagem na proporção horizontal do banner. Você pode enviar do computador ou informar o link da imagem."
              />
              <div className="flex rounded-full bg-white p-1 text-xs font-black shadow-sm">
                <button
                  type="button"
                  onClick={() => setBannerInputMode("upload")}
                  className={`rounded-full px-3 py-2 ${
                    bannerInputMode === "upload" ? "bg-cyan-700 text-white" : "text-slate-500"
                  }`}
                >
                  Enviar imagem
                </button>
                <button
                  type="button"
                  onClick={() => setBannerInputMode("url")}
                  className={`rounded-full px-3 py-2 ${
                    bannerInputMode === "url" ? "bg-cyan-700 text-white" : "text-slate-500"
                  }`}
                >
                  Usar link
                </button>
              </div>
            </div>

            <Field
              name="title"
              label="Nome interno do banner"
              help="Nome opcional para identificar esse banner dentro do painel."
              defaultValue=""
            />

            {bannerInputMode === "upload" ? (
              <label className="grid gap-2 text-sm">
                <FieldLabel
                  label="Imagem do banner"
                  help="Envie uma imagem JPG, PNG, WEBP ou GIF com até 8MB."
                />
                <input
                  type="file"
                  name="imageFile"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-cyan-700 file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
                />
              </label>
            ) : (
              <Field
                name="imageUrl"
                label="Link da imagem"
                help="Cole aqui o link direto da imagem do banner."
                defaultValue=""
              />
            )}

            <div className="flex justify-end">
              <button
                disabled={isBannerPending}
                className="rounded bg-cyan-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-cyan-800 disabled:opacity-60"
              >
                {isBannerPending ? "Adicionando..." : "+ Adicionar banner"}
              </button>
            </div>
          </form>

          <div className="grid gap-3">
            {store.banners.length ? (
              store.banners.map((banner, index) => (
                <article
                  key={banner.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[220px_1fr_auto]"
                >
                  <div
                    className="min-h-24 rounded-xl bg-slate-100 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url("${banner.imageUrl}")` }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Banner {index + 1}
                    </p>
                    <h3 className="mt-1 truncate font-black text-slate-700">
                      {banner.title || "Sem nome"}
                    </h3>
                    <p className="mt-2 truncate text-xs font-semibold text-slate-500">
                      {banner.imageUrl}
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                        banner.active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {banner.active ? "Ativo no site" : "Desativado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:flex-col md:items-end md:justify-center">
                    <button
                      type="button"
                      disabled={isBannerPending}
                      onClick={() => updateBannerStatus(banner.id, !banner.active)}
                      className={`rounded-full px-4 py-2 text-xs font-black text-white disabled:opacity-60 ${
                        banner.active ? "bg-red-600" : "bg-green-600"
                      }`}
                    >
                      {banner.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      disabled={isBannerPending}
                      onClick={() => deleteBanner(banner.id)}
                      className="rounded-full border border-red-200 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Nenhum banner cadastrado. Enquanto isso, a loja usa o banner padrão do tema.
              </div>
            )}
          </div>
        </div>
        </div>

        <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            form="general-settings-form"
            disabled={isPending}
            className="rounded bg-green-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "✓ Salvar Alterações"}
          </button>
        </footer>
      </section>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Configurações salvas!"
          errorTitle="Não foi possível salvar"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  help,
  name,
  defaultValue,
  value,
  readOnly = false,
  required = false,
}: {
  label: string;
  help: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <FieldLabel label={label} help={help} />
      <input
        name={name}
        defaultValue={defaultValue}
        value={value}
        readOnly={readOnly}
        required={required}
        className="h-11 rounded border border-slate-200 bg-white px-3 outline-none focus:border-cyan-600 read-only:bg-slate-100 read-only:text-slate-500"
      />
    </label>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="flex items-center gap-2 font-bold text-slate-600">
      {label}
      <span className="group relative inline-grid size-5 cursor-help place-items-center rounded-full border border-cyan-200 bg-cyan-50 text-[11px] font-black text-cyan-700">
        ?
        <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold leading-5 text-white shadow-xl group-hover:block">
          {help}
        </span>
      </span>
    </span>
  );
}
