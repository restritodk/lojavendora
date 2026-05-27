import Link from "next/link";
import Image from "next/image";
import type {
  Category,
  Product,
  ProductImage,
} from "@/app/generated/prisma/client";
import {
  GiftGoalBanner,
  StockScarcityBadge,
  StoreAppEffects,
} from "@/components/store/store-app-effects";
import { StoreBannerCarousel } from "@/components/store/store-banner-carousel";
import type { StorefrontStore } from "@/components/store/templates/types";
import type { StoreAdvancedSettingMap } from "@/lib/store-advanced-settings";

type StorefrontProps = {
  store: StorefrontStore;
  advancedSettings?: StoreAdvancedSettingMap;
};

export type StorefrontProduct = Product & {
  category: Category | null;
  images?: ProductImage[];
};

export function Storefront({ store, advancedSettings }: StorefrontProps) {
  const accentColor = store.accentColor ?? "#10b981";
  const primaryColor = store.primaryColor ?? "#0f172a";
  const secondaryColor = store.secondaryColor ?? "#f8fafc";
  const storePath = `/store/${store.subdomain}`;
  const productsByCategory = store.categories.map((category) => ({
    ...category,
    products: store.products.filter((product) => product.categoryId === category.id),
  }));
  const featuredProducts = store.products.filter((product) => product.showOnHome).slice(0, 8);
  const bestSellers = store.products.slice(0, 4);
  const banners = store.banners?.length
    ? store.banners
    : store.bannerImageUrl
      ? [{ id: "legacy-banner", imageUrl: store.bannerImageUrl, title: store.bannerTitle }]
      : [];
  const hasCustomBannerImage = banners.length > 0;

  return (
    <main className="min-h-screen text-slate-950" style={{ background: secondaryColor }}>
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 shadow-[0_12px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="bg-slate-950 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] sm:px-8 lg:px-12">
            <div className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-white/10 text-xs">
                ✓
              </span>
              <span>Entrega garantida para todo o Brasil</span>
            </div>
            <div className="hidden items-center gap-5 tracking-[0.08em] sm:flex">
              <Link href={`${storePath}/pedidos`} className="text-white/80 transition hover:text-white">
                Meus pedidos
              </Link>
              <span className="h-3 w-px bg-white/20" />
              <Link href={`${storePath}/ajuda`} className="text-white/80 transition hover:text-white">
                Ajuda
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-5 px-5 py-5 sm:px-8 md:grid-cols-[220px_1fr_auto] lg:px-12">
          <Link href={storePath} className="flex min-w-fit items-center gap-3">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={110}
                height={56}
                unoptimized
                className="max-h-14 w-auto rounded-2xl object-contain"
              />
            ) : (
              <span
                className="grid size-12 place-items-center rounded-2xl text-lg font-black text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
              >
                {store.name.charAt(0)}
              </span>
            )}
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.26em]" style={{ color: accentColor }}>
                Vendora Store
              </span>
              <span className="block text-3xl font-black leading-none tracking-tight">
                {store.name}
              </span>
            </span>
          </Link>

          <div className="order-3 md:order-none">
            <label className="relative block">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>
            <input
              placeholder="Buscar produto, categoria ou marca"
                className="h-14 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-12 pr-5 text-sm font-medium outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
            />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href={`${storePath}/login`}
              className="group hidden items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex"
              title="Login"
            >
              <span className="grid size-9 place-items-center rounded-full bg-zinc-100 text-sm transition group-hover:bg-slate-950 group-hover:text-white">
                👤
              </span>
              <span className="text-left text-xs font-black leading-tight text-slate-700">
                Minha conta
                <small className="block font-semibold text-slate-400">
                  Entrar
                </small>
              </span>
            </Link>
            <button
              className="group relative flex items-center gap-3 rounded-full px-4 py-2.5 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: primaryColor }}
              title="Carrinho"
            >
              <span className="grid size-9 place-items-center rounded-full bg-white/10 text-sm">
                🛒
              </span>
              <span className="hidden text-left text-xs font-black leading-tight sm:block">
                Carrinho
                <small className="block font-semibold text-white/60">
                  R$ 0,00
                </small>
              </span>
              <span
                className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full text-xs font-black text-white ring-2 ring-white"
                style={{ background: accentColor }}
              >
                0
              </span>
            </button>
          </div>
        </div>

        <nav className="border-t border-zinc-100 bg-white">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 text-sm font-black text-slate-700 sm:px-8 lg:px-12">
            <Link
              href={storePath}
              className="rounded-full px-4 py-2 text-slate-950 transition hover:bg-zinc-100"
            >
              Início
            </Link>
            <a
              href="#mais-vendidos"
              className="rounded-full px-4 py-2 transition hover:bg-zinc-100 hover:text-slate-950"
            >
              Mais vendidos
            </a>
            {store.categories.map((category) => (
              <a
                key={category.id}
                href={`#categoria-${category.slug}`}
                className="rounded-full px-4 py-2 transition hover:bg-zinc-100 hover:text-slate-950"
              >
                {category.name}
              </a>
            ))}
            <a
              href="#sobre"
              className="rounded-full px-4 py-2 transition hover:bg-zinc-100 hover:text-slate-950"
            >
              Sobre nós
            </a>
            <a
              href="#contato"
              className="rounded-full px-4 py-2 transition hover:bg-zinc-100 hover:text-slate-950"
            >
              Contato
            </a>
          </div>
        </nav>
      </header>
      <GiftGoalBanner advancedSettings={advancedSettings} />

      {hasCustomBannerImage ? (
        <StoreBannerCarousel
          banners={banners}
          heightClassName="h-[230px] sm:h-[320px] lg:h-[420px]"
          backgroundClassName="bg-white"
        />
      ) : (
        <section className="relative min-h-[540px] overflow-hidden text-white">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg, ${primaryColor}e6, ${primaryColor}8c, ${accentColor}55), url("https://picsum.photos/seed/${store.subdomain}-hero/1600/720")`,
            }}
          />
          <div className="relative mx-auto flex min-h-[540px] max-w-7xl items-center px-5 py-20 sm:px-8 lg:px-12">
            <div className="max-w-2xl">
              <p className="font-serif text-lg italic text-white/85">
                Conheça nossas novidades
              </p>
              <h2 className="mt-4 text-5xl font-black uppercase leading-[0.95] tracking-tight lg:text-7xl">
                {store.bannerTitle ?? "Produtos selecionados para comprar sem complicação."}
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">
                {store.bannerSubtitle ??
                  "Loja criada com a Vendora e pronta para receber seus clientes."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#produtos"
                  className="rounded-sm px-8 py-4 text-center text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition hover:-translate-y-0.5"
                  style={{ background: accentColor }}
                >
                  Comprar agora
                </a>
                <Link
                  href={`${storePath}/login`}
                  className="rounded-sm border border-white/40 px-8 py-4 text-center text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  Acompanhar pedidos
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-amber-300 bg-amber-400">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
          {[
            ["🚚", "Entrega garantida", "Envio para todo o Brasil"],
            ["💳", "Compra facilitada", "Checkout rápido e seguro"],
            ["💵", "Divida no cartão", "Parcelamento facilitado"],
            ["🔒", "100% seguro", "Compra protegida"],
          ].map(([icon, title, description]) => (
            <div
              key={title}
              className="flex min-h-20 items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-xl">
                {icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black leading-tight">{title}</p>
                <p className="mt-1 text-xs leading-tight text-slate-600">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-3">
          {store.categories.map((category, index) => (
            <CategoryBanner
              key={category.id}
              category={category}
              index={index}
              accentColor={accentColor}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      </section>

      <section id="mais-vendidos" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <SectionTitle eyebrow="Os mais queridinhos" title="Mais vendidos" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              storePath={storePath}
              primaryColor={primaryColor}
              accentColor={accentColor}
              advancedSettings={advancedSettings}
            />
          ))}
        </div>
      </section>

      <section id="produtos" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4">
          <SectionTitle eyebrow="O que há de mais novo" title="Produtos em destaque" />
          <a href="#" className="text-sm font-bold text-slate-600">
            Ver todos
          </a>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              storePath={storePath}
              primaryColor={primaryColor}
              accentColor={accentColor}
              advancedSettings={advancedSettings}
            />
          ))}
        </div>
      </section>

      <section id="todos-produtos" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <SectionTitle eyebrow="Catálogo completo" title="Todos os produtos" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {store.products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              storePath={storePath}
              primaryColor={primaryColor}
              accentColor={accentColor}
              advancedSettings={advancedSettings}
            />
          ))}
        </div>
      </section>

      {productsByCategory.map((category) =>
        category.products.length > 0 ? (
          <section
            key={category.id}
            id={`categoria-${category.slug}`}
            className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12"
          >
            <WideCategoryBanner
              category={category}
              primaryColor={primaryColor}
              accentColor={accentColor}
            />

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {category.products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  storePath={storePath}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  advancedSettings={advancedSettings}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <section className="relative mx-auto mb-16 max-w-7xl overflow-hidden rounded-none px-5 sm:px-8 lg:px-12">
        <div
          className="min-h-72 bg-cover bg-center px-8 py-16 text-center text-white shadow-xl"
          style={{
            backgroundImage: `linear-gradient(90deg, ${primaryColor}cc, ${primaryColor}99), url("https://picsum.photos/seed/${store.subdomain}-processo/1400/420")`,
          }}
        >
          <p className="font-serif text-lg italic text-white/80">
            Conheça mais um pouco
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black uppercase leading-tight">
            Bastidores, qualidade e produtos escolhidos com cuidado
          </h2>
          <a
            href="#sobre"
            className="mt-8 inline-flex rounded-sm px-7 py-3 text-xs font-black uppercase tracking-[0.2em] text-white"
            style={{ background: accentColor }}
          >
            Saiba mais
          </a>
        </div>
      </section>

      <section id="sobre" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <div className="grid gap-8 bg-white p-8 shadow-sm lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: accentColor }}>
              Sobre nós
            </p>
            <h2 className="mt-3 text-4xl font-black">{store.name}</h2>
            <p className="mt-4 leading-7 text-slate-600">
              {store.description ??
                "Somos uma loja criada para oferecer uma experiência simples, confiável e agradável. Aqui você encontra produtos selecionados, atendimento próximo e compra segura."}
            </p>
          </div>
          <div id="contato" className="bg-zinc-50 p-6">
            <h3 className="text-2xl font-black">Entre em contato</h3>
            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <p className="bg-white p-4 shadow-sm">📧 contato@seuemail.com.br</p>
              <p className="bg-white p-4 shadow-sm">📱 (00) 99999-9999</p>
              <p className="bg-white p-4 shadow-sm">
                🕘 Segunda a sexta das 9h às 18h
              </p>
              <p className="bg-white p-4 shadow-sm">
                📍 Rua da Loja, 123 - Centro
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.28em]" style={{ color: accentColor }}>
            Receba novidades & descontos
          </p>
          <h2 className="mt-3 text-3xl font-black">Fique em contato</h2>
          <form className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Digite seu e-mail"
              className="h-13 flex-1 border border-zinc-200 px-5 text-sm outline-none focus:border-slate-400"
            />
            <button
              className="h-13 px-8 text-xs font-black uppercase tracking-[0.2em] text-white"
              style={{ background: primaryColor }}
            >
              Receber
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-4 lg:px-12">
          <div>
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={140}
                height={70}
                unoptimized
                className="mb-5 max-h-16 w-auto rounded-xl object-contain"
              />
            ) : (
              <div className="mb-5 grid size-20 place-items-center rounded-full border border-white/20 text-center text-xs font-black uppercase">
                Logo
              </div>
            )}
            <h2 className="text-2xl font-black">{store.name}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              {store.description ??
                "Loja online com experiência moderna, segura e preparada para vender."}
            </p>
          </div>
          <div>
            <p className="font-black">Páginas</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-400">
              <Link href={storePath}>Início</Link>
              <a href="#produtos">Produtos</a>
              <a href="#sobre">Quem somos</a>
              <a href="#contato">Contato</a>
            </div>
          </div>
          <div>
            <p className="font-black">Cliente</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-400">
              <Link href={`${storePath}/login`}>Login</Link>
              <Link href={`${storePath}/pedidos`}>Meus pedidos</Link>
              <Link href={`${storePath}/ajuda`}>Ajuda</Link>
            </div>
          </div>
          <div>
            <p className="font-black">Pagamentos</p>
            <p className="mt-4 text-sm text-slate-400">
              Cartão, Pix e boleto. Ambiente seguro para finalizar sua compra.
            </p>
            <div className="mt-5 flex gap-2 text-xs font-black text-slate-950">
              <span className="rounded bg-white px-2 py-1">Visa</span>
              <span className="rounded bg-white px-2 py-1">Pix</span>
              <span className="rounded bg-white px-2 py-1">Boleto</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-slate-500">
          COPYRIGHT © {store.name} 2026 - TODOS OS DIREITOS RESERVADOS
        </div>
      </footer>
      <StoreAppEffects advancedSettings={advancedSettings} />
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-black">{title}</h2>
    </div>
  );
}

function CategoryBanner({
  category,
  index,
  primaryColor,
  accentColor,
}: {
  category: Category;
  index: number;
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <a
      href={`#categoria-${category.slug}`}
      className="group relative min-h-72 overflow-hidden bg-slate-900 p-8 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `linear-gradient(180deg, ${primaryColor}33, ${primaryColor}cc), url("https://picsum.photos/seed/${category.slug}-${index}/640/720")`,
        }}
      />
      <div className="relative flex min-h-56 flex-col justify-end">
        <p className="font-serif text-lg italic text-white/80">
          {index % 2 === 0 ? "Entregamos qualidade" : "Temos de tudo"}
        </p>
        <h3 className="mt-2 text-3xl font-black uppercase leading-tight">
          {category.name}
        </h3>
        <span
          className="mt-5 w-fit rounded-sm px-4 py-2 text-xs font-black uppercase tracking-[0.18em]"
          style={{ background: accentColor }}
        >
          Comprar agora
        </span>
      </div>
    </a>
  );
}

function WideCategoryBanner({
  category,
  primaryColor,
  accentColor,
}: {
  category: Category & { products: StorefrontProduct[] };
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <div
      className="grid min-h-72 overflow-hidden bg-cover bg-center text-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]"
      style={{
        backgroundImage: `linear-gradient(90deg, ${primaryColor}dd, ${primaryColor}77), url("https://picsum.photos/seed/banner-${category.slug}/1400/420")`,
      }}
    >
      <div className="flex flex-col justify-center p-8 lg:p-12">
        <p className="font-serif text-lg italic text-white/80">Categoria especial</p>
        <h2 className="mt-2 text-4xl font-black uppercase leading-tight">
          {category.name}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
          Produtos selecionados para quem procura praticidade, qualidade e uma
          experiência de compra simples.
        </p>
        <a
          href="#produtos"
          className="mt-7 w-fit rounded-sm px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white"
          style={{ background: accentColor }}
        >
          Ver produtos
        </a>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  storePath,
  primaryColor,
  accentColor,
  advancedSettings,
}: {
  product: StorefrontProduct;
  index: number;
  storePath: string;
  primaryColor: string;
  accentColor: string;
  advancedSettings?: StoreAdvancedSettingMap;
}) {
  const price = Number(product.price);
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : price * (1 + (index + 2) * 0.06);
  const installment = price / 3;
  const productImage = product.images?.[0]?.url ?? product.imageUrl;

  return (
    <article id={`produto-${product.slug}`} className="group scroll-mt-32 overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent, ${primaryColor}22), url("${productImage ?? `https://picsum.photos/seed/${product.slug}-${index}/620/620`}")`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
        <span
          className="absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg"
          style={{ background: accentColor }}
        >
          Lançamento
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-lg">
          -{(index + 1) * 6}%
        </span>
        <button
          className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white text-sm shadow-lg transition hover:scale-105"
          type="button"
          title="Favoritar produto"
        >
          ♡
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
            {product.category?.name ?? "Produto"}
          </span>
          <span className="text-xs font-black text-amber-500">★★★★★</span>
        </div>

        <h3 className="mt-4 min-h-12 text-lg font-black leading-tight text-slate-950">
          {product.name}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-slate-500">
          {product.description}
        </p>

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <p className="text-xs text-slate-400 line-through">
            {oldPrice.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <strong className="mt-1 block text-2xl tracking-tight text-slate-950">
            {price.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            ou 3x de{" "}
            {installment.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}{" "}
            sem juros
          </p>
          <div className="mt-3">
            <StockScarcityBadge
              stock={product.stock}
              criticalStock={product.criticalStock}
              advancedSettings={advancedSettings}
            />
          </div>
        </div>

        <Link
          href={`${storePath}/produto/${product.slug}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3.5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg transition hover:opacity-90"
          style={{ background: primaryColor }}
        >
          <span>Ver mais</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
