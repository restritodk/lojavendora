import "server-only";
import { prisma } from "@/lib/prisma";
import { getStoreIntegrationContext } from "./settings";

export async function buildStoreProductFeed(storeSlug: string, appId: string) {
  const store = await prisma.store.findUnique({
    where: { subdomain: storeSlug },
    select: {
      id: true,
      name: true,
      subdomain: true,
    },
  });

  if (!store) {
    return null;
  }

  const context = await getStoreIntegrationContext(store.id, appId);

  if (!context?.active) {
    return null;
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      status: "ACTIVE",
      showOnSite: true,
    },
    include: {
      category: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    store,
    appId,
    products: products.map((product) => ({
      id: product.id,
      sku: product.customCode || product.id,
      title: product.name,
      description: product.description || product.shortDescription || product.name,
      link: `/store/${store.subdomain}/produto/${product.slug}`,
      image: product.images[0]?.url || product.imageUrl || "",
      price: Number(product.price),
      availability: product.stock > 0 || product.allowOutOfStock ? "in stock" : "out of stock",
      stock: product.stock,
      brand: product.brand || store.name,
      category: product.category?.googleShoppingCategory || product.category?.name || "",
      weight: product.weight ? Number(product.weight) : null,
      dimensions: {
        height: product.height ? Number(product.height) : null,
        width: product.width ? Number(product.width) : null,
        length: product.length ? Number(product.length) : null,
      },
    })),
  };
}

export function productFeedToXml(feed: NonNullable<Awaited<ReturnType<typeof buildStoreProductFeed>>>) {
  const items = feed.products
    .map((product) => `
      <item>
        <g:id>${escapeXml(product.sku)}</g:id>
        <g:title>${escapeXml(product.title)}</g:title>
        <g:description>${escapeXml(product.description)}</g:description>
        <g:link>${escapeXml(product.link)}</g:link>
        <g:image_link>${escapeXml(product.image)}</g:image_link>
        <g:availability>${product.availability}</g:availability>
        <g:price>${product.price.toFixed(2)} BRL</g:price>
        <g:brand>${escapeXml(product.brand)}</g:brand>
        <g:google_product_category>${escapeXml(product.category)}</g:google_product_category>
      </item>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(feed.store.name)}</title>
    <link>/store/${escapeXml(feed.store.subdomain)}</link>
    <description>Feed de produtos da loja ${escapeXml(feed.store.name)}</description>
    ${items}
  </channel>
</rss>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
