import Link from "next/link";
import {
  TechProductCard,
  TemplateFooter,
  TemplateHeader,
} from "@/components/store/templates/shared";
import type {
  StorefrontCategory,
  StorefrontProduct,
  StorefrontStore,
} from "@/components/store/templates/types";
import type { StoreAdvancedSettingMap } from "@/lib/store-advanced-settings";

export function CategoryProductList({
  store,
  category,
  products,
  advancedSettings,
}: {
  store: StorefrontStore;
  category: StorefrontCategory;
  products: StorefrontProduct[];
  advancedSettings?: StoreAdvancedSettingMap;
}) {
  const storePath = `/store/${store.subdomain}`;
  const isTech = store.storeTemplate?.slug === "tech-store";

  return (
    <main className={isTech ? "min-h-screen bg-[#f4f6f8]" : "min-h-screen bg-slate-50"}>
      <TemplateHeader store={store} variant={isTech ? "tech" : "default"} />
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href={storePath} className="font-semibold hover:text-slate-950">
            Início
          </Link>
          <span>›</span>
          <span className="font-black text-slate-950">{category.name}</span>
        </div>

        <div
          className={`mb-8 rounded-3xl p-8 text-white ${
            isTech ? "bg-[#003b70]" : "bg-slate-950"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
            Categoria
          </p>
          <h1 className="mt-2 text-4xl font-black">{category.name}</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {category.description ??
              "Confira todos os produtos disponíveis nesta categoria."}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {products.map((product) => (
              <TechProductCard
                key={product.id}
                product={product}
                storePath={storePath}
                advancedSettings={advancedSettings}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Nenhum produto encontrado nesta categoria.
          </div>
        )}
      </section>
      <TemplateFooter store={store} variant={isTech ? "tech" : "default"} />
    </main>
  );
}
