import Image from "next/image";
import Link from "next/link";
import type {
  ProductDetailTemplateProps,
  StorefrontProduct,
  StorefrontStore,
} from "./types";
import { StockScarcityBadge } from "@/components/store/store-app-effects";
import type { StoreAdvancedSettingMap } from "@/lib/store-advanced-settings";

export function TemplateHeader({
  store,
  variant = "default",
}: {
  store: StorefrontStore | ProductDetailTemplateProps["store"];
  variant?: "default" | "tech";
}) {
  const storePath = `/store/${store.subdomain}`;
  const isTech = variant === "tech";
  const primaryColor = isTech ? "#004b8d" : (store.primaryColor ?? "#0f172a");
  const accentColor = isTech ? "#ff6500" : (store.accentColor ?? "#38bdf8");
  const rootCategories = store.categories.filter((category) => !category.parentId);
  const visibleCategories = rootCategories.slice(0, 10);
  const hasMoreCategories = rootCategories.length > 10;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="text-white" style={{ background: primaryColor }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 text-xs font-bold sm:px-8 lg:px-12">
          <span>Entrega para todo o Brasil</span>
          <div className="hidden items-center gap-4 md:flex">
            <Link href={`${storePath}/pedidos`}>Meus pedidos</Link>
            <Link href={`${storePath}/ajuda`}>Ajuda</Link>
            <Link href={`${storePath}/login`}>Login</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-4 px-5 py-4 sm:px-8 md:grid-cols-[220px_1fr_auto] lg:px-12">
        <Link href={storePath} className="flex items-center gap-3">
          {store.logoUrl ? (
            <Image
              src={store.logoUrl}
              alt={store.name}
              width={96}
              height={48}
              unoptimized
              className="max-h-12 w-auto rounded-xl object-contain"
            />
          ) : (
            <span
              className="grid size-12 place-items-center rounded-xl text-lg font-black text-white"
              style={{ background: accentColor }}
            >
              {store.name.charAt(0)}
            </span>
          )}
          <span>
            <span className="block text-2xl font-black leading-none text-slate-950">
              {store.name}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {isTech ? "tecnologia e ofertas" : "loja online"}
            </span>
          </span>
        </Link>
        <label className="relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            🔎
          </span>
          <input
            placeholder="Busque aqui"
            className="h-12 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-400"
          />
        </label>
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`${storePath}/login`}
            className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 sm:block"
          >
            Minha conta
          </Link>
          <button
            className="relative rounded-full px-5 py-3 text-xs font-black text-white"
            style={{ background: isTech ? accentColor : primaryColor }}
          >
            Carrinho
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-slate-950 text-[10px] text-white">
              0
            </span>
          </button>
        </div>
      </div>
      <nav className="overflow-visible border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-visible px-5 py-3 text-sm font-black text-slate-700 sm:px-8 lg:px-12">
          <Link href={storePath} className="rounded-full px-4 py-2 hover:bg-slate-100">
            Início
          </Link>
          <Link href={`${storePath}#produtos`} className="rounded-full px-4 py-2 hover:bg-slate-100">
            Ofertas
          </Link>
          {visibleCategories.map((category) => (
            <div key={category.id} className="group relative shrink-0">
              <Link
                href={`${storePath}/categoria/${category.slug}`}
                className="flex items-center gap-1 rounded-full px-4 py-2 hover:bg-slate-100"
              >
                {category.name}
                {category.children?.length ? <span className="text-[10px]">▾</span> : null}
              </Link>
              {category.children?.length ? (
                <div className="invisible absolute left-0 top-full z-[999] min-w-56 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`${storePath}/categoria/${child.slug}`}
                        className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#004b8d]"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {hasMoreCategories ? (
            <details className="group/more relative shrink-0">
              <summary
                className="flex cursor-pointer list-none items-center gap-2 rounded-full px-4 py-2 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
                aria-label="Ver todas as categorias"
              >
                <span className="grid gap-0.5">
                  <span className="block h-0.5 w-5 rounded-full bg-slate-700" />
                  <span className="block h-0.5 w-5 rounded-full bg-slate-700" />
                  <span className="block h-0.5 w-5 rounded-full bg-slate-700" />
                </span>
                <span className="sr-only">Todas as categorias</span>
              </summary>
              <div className="absolute right-0 top-full z-[999] w-72 pt-2">
                <div className="max-h-[70vh] overflow-visible rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl">
                  {rootCategories.map((category) => (
                    <div key={category.id} className="group/category relative">
                      <Link
                        href={`${storePath}/categoria/${category.slug}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#004b8d]"
                      >
                        <span>{category.name}</span>
                        {category.children?.length ? (
                          <span className="text-[10px]">‹</span>
                        ) : null}
                      </Link>
                      {category.children?.length ? (
                        <div className="invisible absolute right-full top-0 z-[1000] min-w-56 pr-2 opacity-0 transition group-hover/category:visible group-hover/category:opacity-100">
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl">
                            {category.children.map((child) => (
                              <Link
                                key={child.id}
                                href={`${storePath}/categoria/${child.slug}`}
                                className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#004b8d]"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
          <Link href={`${storePath}#contato`} className="rounded-full px-4 py-2 hover:bg-slate-100">
            Atendimento
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function TemplateFooter({
  store,
  variant = "default",
}: {
  store: StorefrontStore | ProductDetailTemplateProps["store"];
  variant?: "default" | "tech";
}) {
  const storePath = `/store/${store.subdomain}`;
  const bgColor = variant === "tech" ? "#003b70" : "#0f172a";

  return (
    <footer className="mt-12 text-white" style={{ background: bgColor }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-4 lg:px-12">
        <div>
          {store.logoUrl ? (
            <Image
              src={store.logoUrl}
              alt={store.name}
              width={140}
              height={70}
              unoptimized
              className="max-h-16 w-auto rounded-xl object-contain"
            />
          ) : (
            <h2 className="text-2xl font-black">{store.name}</h2>
          )}
          <p className="mt-4 text-sm leading-6 text-white/65">
            {store.description ??
              "Loja online criada com Vendora, pronta para vender com segurança."}
          </p>
        </div>
        <div>
          <p className="font-black">Institucional</p>
          <div className="mt-4 grid gap-2 text-sm text-white/65">
            <Link href={storePath}>Início</Link>
            <Link href={`${storePath}#sobre`}>Quem somos</Link>
            <Link href={`${storePath}#contato`}>Contato</Link>
            {store.pages?.map((page) => (
              <Link key={page.id} href={`${storePath}/pagina/${page.slug}`}>
                {page.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="font-black">Atendimento</p>
          <p className="mt-4 text-sm leading-6 text-white/65">
            atendimento@lojavendora.com.br
            <br />
            Segunda a sexta das 9h às 18h
          </p>
        </div>
        <div>
          <p className="font-black">Pagamentos</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-slate-950">
            <span className="rounded bg-white px-2 py-1">Visa</span>
            <span className="rounded bg-white px-2 py-1">Pix</span>
            <span className="rounded bg-white px-2 py-1">Boleto</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-center text-xs text-white/50">
        COPYRIGHT © {store.name} 2026 - TODOS OS DIREITOS RESERVADOS
      </div>
    </footer>
  );
}

export function TechProductCard({
  product,
  storePath,
  advancedSettings,
}: {
  product: StorefrontProduct;
  storePath: string;
  advancedSettings?: StoreAdvancedSettingMap;
}) {
  const productImage = product.images?.[0]?.url ?? product.imageUrl;
  const price = Number(product.price);
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : price * 1.18;

  return (
    <Link
      href={`${storePath}/produto/${product.slug}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative grid aspect-square place-items-center bg-white p-4">
        <span className="absolute left-3 top-3 rounded bg-[#ff6500] px-2 py-1 text-[10px] font-black uppercase text-white">
          Oferta
        </span>
        <Image
          src={productImage ?? `https://picsum.photos/seed/${product.slug}/500/500`}
          alt={product.name}
          width={500}
          height={500}
          unoptimized
          className="size-full object-contain transition group-hover:scale-105"
        />
      </div>
      <div className="border-t border-slate-100 p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-800">
          {product.name}
        </h3>
        <p className="mt-3 text-xs text-slate-400 line-through">
          {formatCurrency(oldPrice)}
        </p>
        <strong className="block text-xl font-black text-[#ff6500]">
          {formatCurrency(price)}
        </strong>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          à vista no Pix
        </p>
        <div className="mt-3">
          <StockScarcityBadge
            stock={product.stock}
            criticalStock={product.criticalStock}
            advancedSettings={advancedSettings}
          />
        </div>
      </div>
    </Link>
  );
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
