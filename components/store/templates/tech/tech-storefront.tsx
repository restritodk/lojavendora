import Link from "next/link";
import {
  TechProductCard,
  TemplateFooter,
  TemplateHeader,
} from "@/components/store/templates/shared";
import { StoreBannerCarousel } from "@/components/store/store-banner-carousel";
import { GiftGoalBanner, StoreAppEffects } from "@/components/store/store-app-effects";
import type { StorefrontTemplateProps } from "@/components/store/templates/types";
import type { StoreAdvancedSettingMap } from "@/lib/store-advanced-settings";

export function TechStorefront({ store, advancedSettings }: StorefrontTemplateProps) {
  const storePath = `/store/${store.subdomain}`;
  const launchProducts = store.products.filter((product) => product.isLaunch).slice(0, 5);
  const featuredProducts = store.products.filter((product) => product.showOnHome).slice(0, 10);
  const rootCategories = store.categories.filter((category) => !category.parentId);
  const featuredCategories = rootCategories.filter((category) => category.featured);
  const showcaseCategories = featuredCategories.length ? featuredCategories : rootCategories;
  const banners = store.banners?.length
    ? store.banners
    : store.bannerImageUrl
      ? [{ id: "legacy-banner", imageUrl: store.bannerImageUrl, title: store.bannerTitle }]
      : [];
  const hasCustomBannerImage = banners.length > 0;
  const bannerImage = `https://picsum.photos/seed/${store.subdomain}-tech-banner/900/520`;

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <TemplateHeader store={store} variant="tech" />
      <GiftGoalBanner advancedSettings={advancedSettings} />

      {hasCustomBannerImage ? (
        <StoreBannerCarousel
          banners={banners}
          heightClassName="h-[180px] sm:h-[260px] lg:h-[330px]"
          backgroundClassName="bg-[#003b70]"
        />
      ) : (
        <section className="bg-[#003b70] text-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <div
            className="overflow-hidden rounded-3xl bg-cover bg-center p-8 shadow-xl"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(0,59,112,0.96), rgba(0,59,112,0.78), rgba(0,59,112,0.28)), url("${bannerImage}")`,
            }}
          >
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-300">
              Mega oferta tech
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight lg:text-6xl">
              {store.bannerTitle ?? "Tecnologia com preço agressivo para vender mais"}
            </h1>
            <p className="mt-5 max-w-xl text-white/75">
              {store.bannerSubtitle ?? "Produtos eletrônicos, informática e smart home com vitrine de alta conversão."}
            </p>
            <Link
              href="#produtos"
              className="mt-8 inline-flex rounded-xl bg-[#ff6500] px-7 py-4 text-sm font-black uppercase tracking-wide text-white"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
      </section>
      )}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-5 py-5 sm:px-8 lg:px-12">
          {showcaseCategories.map((category) => (
            <Link
              key={category.id}
              href={`${storePath}/categoria/${category.slug}`}
              className="grid min-w-28 place-items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs font-black uppercase text-slate-700 shadow-sm"
            >
              <span className="text-2xl">{getCategoryIcon(category.slug, category.name)}</span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <PromoStrip title="Ofertas selecionadas" subtitle="Produtos com destaque para conversão rápida" />
        <ProductGrid
          products={featuredProducts.length ? featuredProducts : store.products.slice(0, 10)}
          storePath={storePath}
          advancedSettings={advancedSettings}
        />
      </section>

      {launchProducts.length > 0 ? (
        <section className="bg-white py-8">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <PromoStrip title="Lançamentos" subtitle="Novidades para sua loja de eletrônicos" compact />
            <ProductGrid products={launchProducts} storePath={storePath} advancedSettings={advancedSettings} />
          </div>
        </section>
      ) : null}

      {featuredCategories.map((category) => {
        const categoryIds = [category.id, ...(category.children ?? []).map((child) => child.id)];
        const products = store.products
          .filter((product) => product.categoryId && categoryIds.includes(product.categoryId))
          .slice(0, 5);
        if (!products.length) return null;

        return (
          <section key={category.id} id={`categoria-${category.slug}`} className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
            <PromoStrip title={category.name} subtitle="Categoria em destaque" compact />
            <ProductGrid products={products} storePath={storePath} advancedSettings={advancedSettings} />
          </section>
        );
      })}

      <section id="contato" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="rounded-3xl bg-[#003b70] p-8 text-white lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-300">Atendimento</p>
            <h2 className="mt-2 text-3xl font-black">Precisa de ajuda para comprar?</h2>
          </div>
          <Link href={`${storePath}/ajuda`} className="mt-6 inline-flex rounded-xl bg-[#ff6500] px-6 py-3 text-sm font-black uppercase text-white lg:mt-0">
            Falar com a loja
          </Link>
        </div>
      </section>

      <TemplateFooter store={store} variant="tech" />
      <StoreAppEffects advancedSettings={advancedSettings} />
    </main>
  );
}

function getCategoryIcon(slug: string, name: string) {
  const normalized = `${slug} ${name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("acessor")) return "🎧";
  if (normalized.includes("informatica") || normalized.includes("comput")) return "💻";
  if (normalized.includes("smart") || normalized.includes("casa")) return "🏠";
  if (normalized.includes("game") || normalized.includes("console")) return "🎮";
  if (normalized.includes("celular") || normalized.includes("phone")) return "📱";
  if (normalized.includes("audio") || normalized.includes("fone")) return "🎧";
  if (normalized.includes("camera") || normalized.includes("foto")) return "📷";
  if (normalized.includes("rede") || normalized.includes("roteador")) return "📡";
  if (normalized.includes("monitor") || normalized.includes("tv")) return "🖥️";
  if (normalized.includes("teste")) return "🧪";

  return "⚡";
}

function PromoStrip({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div className={`mb-5 flex items-center justify-between rounded-2xl bg-[#003b70] px-5 text-white ${compact ? "py-4" : "py-5"}`}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">{subtitle}</p>
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      <span className="rounded-full bg-[#ff6500] px-4 py-2 text-xs font-black uppercase">Oferta</span>
    </div>
  );
}

function ProductGrid({
  products,
  storePath,
  advancedSettings,
}: {
  products: StorefrontTemplateProps["store"]["products"];
  storePath: string;
  advancedSettings?: StoreAdvancedSettingMap;
}) {
  return (
    <div id="produtos" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {products.map((product) => (
        <TechProductCard
          key={product.id}
          product={product}
          storePath={storePath}
          advancedSettings={advancedSettings}
        />
      ))}
    </div>
  );
}
