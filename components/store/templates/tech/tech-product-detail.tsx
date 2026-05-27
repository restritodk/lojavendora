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

export function TechProductDetail({
  store,
  product,
  relatedProducts,
  advancedSettings,
}: ProductDetailTemplateProps) {
  const storePath = `/store/${store.subdomain}`;
  const images = [
    ...product.images.map((image) => image.url),
    ...(product.imageUrl ? [product.imageUrl] : []),
  ];
  const uniqueImages = Array.from(new Set(images));
  const mainImage =
    uniqueImages[0] ?? `https://picsum.photos/seed/${product.slug}/700/700`;
  const price = Number(product.price);
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : price * 1.18;

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <TemplateHeader store={store} variant="tech" />
      <GiftGoalBanner advancedSettings={advancedSettings} />

      <section className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <Link href={storePath}>Início</Link>
          <span>›</span>
          <span>{product.category?.name ?? "Produto"}</span>
          <span>›</span>
          <span className="text-[#ff6500]">{product.name}</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[96px_1fr]">
              <div className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:block lg:space-y-3">
                {(uniqueImages.length ? uniqueImages : [mainImage]).slice(0, 7).map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className={`grid size-20 shrink-0 place-items-center rounded-xl border p-1 ${
                      index === 0 ? "border-[#ff6500]" : "border-slate-200"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={product.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="size-full object-contain"
                    />
                  </div>
                ))}
              </div>
              <div className="order-1 grid min-h-[500px] place-items-center lg:order-2">
                <Image
                  src={mainImage}
                  alt={product.name}
                  width={760}
                  height={760}
                  unoptimized
                  className="max-h-[500px] w-full object-contain"
                />
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <span className="rounded bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">
              Oferta
            </span>
            <h1 className="mt-4 text-xl font-black leading-tight text-slate-900">
              {product.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {product.shortDescription ?? product.description ?? "Produto disponível para compra."}
            </p>

            <div className="mt-5 rounded-xl bg-[#fff4ec] p-5">
              <p className="text-sm text-slate-400 line-through">
                {formatCurrency(oldPrice)}
              </p>
              <strong className="block text-4xl font-black text-[#ff6500]">
                {formatCurrency(price)}
              </strong>
              <p className="mt-1 text-xs font-bold text-slate-600">
                à vista no Pix ou boleto
              </p>
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

            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Quantidade</span>
                <input
                  type="number"
                  min={product.minQuantity}
                  defaultValue={product.minQuantity}
                  className="h-10 w-20 rounded-lg border border-slate-200 text-center text-sm font-black outline-none"
                />
              </div>
              <Link
                href={`${storePath}/checkout?product=${product.slug}&qty=${product.minQuantity}`}
                className="rounded-xl bg-[#ff6500] px-5 py-4 text-center text-sm font-black uppercase text-white shadow-lg"
              >
                Comprar agora
              </Link>
              <Link
                href={`${storePath}/checkout?product=${product.slug}&qty=${product.minQuantity}`}
                className="rounded-xl border border-[#004b8d] px-5 py-3 text-center text-sm font-black uppercase text-[#004b8d]"
              >
                Adicionar ao carrinho
              </Link>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Frete e prazo
              </p>
              {product.freightType === "gratis" ? (
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-black text-emerald-700">
                  Frete grátis para este produto
                </p>
              ) : (
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Informe o CEP no checkout para ver o valor e prazo antes do pagamento.
                </p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Descrição do produto</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
            {product.description ?? product.shortDescription ?? "Produto cadastrado na loja."}
          </p>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Ficha técnica</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Spec label="Marca" value={product.brand ?? "Não informado"} />
            <Spec label="Modelo" value={product.model ?? "Não informado"} />
            <Spec label="Garantia" value={product.warranty ?? "Não informado"} />
            <Spec label="Estoque" value={`${product.stock} unidade(s)`} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">Avaliações dos clientes</h2>
            <span className="text-3xl font-black text-[#ff6500]">{getReviewAverage(product.reviews ?? [])}</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(product.reviews ?? []).length > 0 ? (product.reviews ?? []).map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-black text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                <p className="mt-2 text-sm text-slate-600">{review.comment || "Cliente avaliou este produto."}</p>
                <p className="mt-3 text-xs font-black text-slate-400">{review.customer?.name ?? "Cliente"} · {review.createdAt.toLocaleDateString("pt-BR")}</p>
              </div>
            )) : (
              <p className="text-sm font-semibold text-slate-500">Este produto ainda não recebeu avaliações.</p>
            )}
          </div>
        </section>

        {relatedProducts.length > 0 ? (
          <section className="mt-6">
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-[#003b70] px-5 py-4 text-white">
              <h2 className="text-xl font-black">Quem viu, viu também</h2>
              <Link href={`${storePath}#produtos`} className="text-sm font-black text-orange-200">
                Ver mais
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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

      <TemplateFooter store={store} variant="tech" />
      <StoreAppEffects advancedSettings={advancedSettings} />
    </main>
  );
}

function getReviewAverage(reviews: NonNullable<ProductDetailTemplateProps["product"]["reviews"]>) {
  if (reviews.length === 0) {
    return "0.0";
  }

  return (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  );
}
