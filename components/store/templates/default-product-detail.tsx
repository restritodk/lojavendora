import Image from "next/image";
import Link from "next/link";
import {
  formatCurrency,
  TechProductCard,
  TemplateFooter,
  TemplateHeader,
} from "@/components/store/templates/shared";
import {
  GiftGoalBanner,
  StockScarcityBadge,
  StoreAppEffects,
} from "@/components/store/store-app-effects";
import type { ProductDetailTemplateProps } from "@/components/store/templates/types";

export function DefaultProductDetail({
  store,
  product,
  relatedProducts,
  advancedSettings,
}: ProductDetailTemplateProps) {
  const storePath = `/store/${store.subdomain}`;
  const accentColor = store.accentColor ?? "#38bdf8";
  const image =
    product.images[0]?.url ??
    product.imageUrl ??
    `https://picsum.photos/seed/${product.slug}/700/700`;
  const price = Number(product.price);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <TemplateHeader store={store} />
      <GiftGoalBanner advancedSettings={advancedSettings} />
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="mb-8 text-sm text-slate-500">
          <Link href={storePath}>Início</Link> / {product.category?.name ?? "Produto"} /{" "}
          <span style={{ color: accentColor }}>{product.name}</span>
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
          <div className="grid min-h-[460px] place-items-center bg-slate-50 p-8">
            <Image
              src={image}
              alt={product.name}
              width={700}
              height={700}
              unoptimized
              className="max-h-[440px] w-full object-contain"
            />
          </div>
          <aside>
            <h1 className="text-3xl font-black">{product.name}</h1>
            <p className="mt-4 leading-7 text-slate-500">
              {product.shortDescription ?? product.description ?? "Produto disponível para compra."}
            </p>
            <div className="mt-8 border-y border-slate-100 py-6">
              {product.oldPrice ? (
                <p className="text-sm text-slate-400 line-through">
                  {formatCurrency(Number(product.oldPrice))}
                </p>
              ) : null}
              <strong className="text-4xl font-black" style={{ color: accentColor }}>
                {formatCurrency(price)}
              </strong>
              {product.freightType === "gratis" ? (
                <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  Frete grátis para este produto
                </p>
              ) : null}
              <div className="mt-4">
                <StockScarcityBadge
                  stock={product.stock}
                  criticalStock={product.criticalStock}
                  advancedSettings={advancedSettings}
                />
              </div>
            </div>
            <Link
              href={`${storePath}/checkout?product=${product.slug}&qty=${product.minQuantity}`}
              className="mt-6 block w-full rounded-2xl px-6 py-4 text-center text-sm font-black uppercase text-white"
              style={{ background: accentColor }}
            >
              Comprar agora
            </Link>
          </aside>
        </div>
        <section className="mt-10 border-t border-slate-100 pt-8">
          <h2 className="text-2xl font-black">Descrição do Produto</h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
            {product.description ?? product.shortDescription ?? "Produto cadastrado na loja."}
          </p>
        </section>
        <ProductReviews reviews={product.reviews ?? []} />
        {relatedProducts.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-2xl font-black">Produtos Relacionados</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <TechProductCard
                  key={related.id}
                  product={{ ...related, category: null }}
                  storePath={storePath}
                  advancedSettings={advancedSettings}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>
      <TemplateFooter store={store} />
      <StoreAppEffects advancedSettings={advancedSettings} />
    </main>
  );
}

function ProductReviews({
  reviews,
}: {
  reviews: NonNullable<ProductDetailTemplateProps["product"]["reviews"]>;
}) {
  if (reviews.length === 0) {
    return null;
  }

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <section className="mt-10 rounded-3xl border border-slate-100 bg-slate-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Opinião de quem comprou</p>
          <h2 className="mt-1 text-2xl font-black">Avaliações dos clientes</h2>
        </div>
        <strong className="rounded-2xl bg-white px-4 py-2 text-lg font-black text-amber-500">
          {average.toFixed(1)} ★
        </strong>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment || "Cliente avaliou este produto."}</p>
            <p className="mt-3 text-xs font-black text-slate-400">{review.customer?.name ?? "Cliente"} · {review.createdAt.toLocaleDateString("pt-BR")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
