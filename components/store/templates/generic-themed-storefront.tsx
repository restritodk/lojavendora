import Link from "next/link";
import {
  TechProductCard,
  TemplateFooter,
  TemplateHeader,
} from "@/components/store/templates/shared";
import { StoreBannerCarousel } from "@/components/store/store-banner-carousel";
import { GiftGoalBanner, StoreAppEffects } from "@/components/store/store-app-effects";
import type { StorefrontTemplateProps } from "@/components/store/templates/types";

const themeCopy = {
  "fashion-premium": {
    eyebrow: "Coleções selecionadas",
    title: "Moda com presença para vender mais",
    icon: "✨",
  },
  "beauty-glow": {
    eyebrow: "Rotina de beleza",
    title: "Produtos para autocuidado e bem-estar",
    icon: "💄",
  },
  "pet-friendly": {
    eyebrow: "Cuidado pet",
    title: "Tudo para seu melhor amigo",
    icon: "🐾",
  },
  "casa-clean": {
    eyebrow: "Casa com estilo",
    title: "Itens para ambientes bonitos e funcionais",
    icon: "🏡",
  },
} as const;

type ThemeSlug = keyof typeof themeCopy;

export function GenericThemedStorefront({
  store,
  themeSlug,
  advancedSettings,
}: StorefrontTemplateProps & { themeSlug: ThemeSlug }) {
  const storePath = `/store/${store.subdomain}`;
  const copy = themeCopy[themeSlug];
  const primaryColor = store.primaryColor ?? "#0f172a";
  const accentColor = store.accentColor ?? "#38bdf8";
  const banners = store.banners?.length
    ? store.banners
    : store.bannerImageUrl
      ? [{ id: "legacy-banner", imageUrl: store.bannerImageUrl, title: store.bannerTitle }]
      : [];
  const hasCustomBannerImage = banners.length > 0;
  const rootCategories = store.categories.filter((category) => !category.parentId);
  const featuredCategories = rootCategories.filter((category) => category.featured);
  const showcaseCategories = featuredCategories.length ? featuredCategories : rootCategories;
  const productsByFeaturedCategory = featuredCategories.map((category) => {
    const categoryIds = [category.id, ...(category.children ?? []).map((child) => child.id)];

    return {
      ...category,
      products: store.products
        .filter((product) => product.categoryId && categoryIds.includes(product.categoryId))
        .slice(0, 5),
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <TemplateHeader store={store} />
      <GiftGoalBanner advancedSettings={advancedSettings} />
      {hasCustomBannerImage ? (
        <StoreBannerCarousel
          banners={banners}
          heightClassName="h-[230px] sm:h-[340px] lg:h-[460px]"
          backgroundClassName="bg-white"
        />
      ) : (
        <section
          className="bg-cover bg-center text-white"
          style={{
            backgroundImage: `linear-gradient(90deg, ${primaryColor}e6, ${primaryColor}99), url("https://picsum.photos/seed/${themeSlug}-${store.subdomain}/1600/620")`,
          }}
        >
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12">
            <span className="text-5xl">{copy.icon}</span>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.24em]" style={{ color: accentColor }}>
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl font-black leading-tight">
              {store.bannerTitle ?? copy.title}
            </h1>
            <p className="mt-5 max-w-xl text-white/75">
              {store.bannerSubtitle ?? "Uma loja online pronta para apresentar produtos com personalidade."}
            </p>
            <Link
              href="#produtos"
              className="mt-8 inline-flex rounded-full px-7 py-4 text-sm font-black uppercase text-white"
              style={{ background: accentColor }}
            >
              Comprar agora
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Categorias
            </p>
            <h2 className="text-3xl font-black">Explore a loja</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showcaseCategories.map((category, index) => (
            <Link
              key={category.id}
              href={`${storePath}/categoria/${category.slug}`}
              className="min-h-40 rounded-3xl bg-cover bg-center p-6 text-white shadow-sm"
              style={{
                backgroundImage: `linear-gradient(180deg, ${primaryColor}33, ${primaryColor}dd), url("https://picsum.photos/seed/${category.slug}-${index}/640/420")`,
              }}
            >
              <h3 className="mt-16 text-2xl font-black">{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section id="produtos" className="mx-auto max-w-7xl px-5 pb-12 sm:px-8 lg:px-12">
        <h2 className="text-3xl font-black">Produtos em destaque</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {store.products.slice(0, 10).map((product) => (
            <TechProductCard
              key={product.id}
              product={product}
              storePath={storePath}
              advancedSettings={advancedSettings}
            />
          ))}
        </div>
      </section>

      {productsByFeaturedCategory.map((category) => {
        if (!category.products.length) return null;
        return (
          <section key={category.id} id={`categoria-${category.slug}`} className="mx-auto max-w-7xl px-5 pb-12 sm:px-8 lg:px-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Categoria em destaque
            </p>
            <h2 className="text-2xl font-black">{category.name}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {category.products.map((product) => (
                <TechProductCard
                  key={product.id}
                  product={product}
                  storePath={storePath}
                  advancedSettings={advancedSettings}
                />
              ))}
            </div>
          </section>
        );
      })}

      <TemplateFooter store={store} />
      <StoreAppEffects advancedSettings={advancedSettings} />
    </main>
  );
}
