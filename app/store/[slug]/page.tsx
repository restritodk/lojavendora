import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { StorefrontRenderer } from "@/components/store/templates/registry";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { getStoreAdvancedSettings, isStoreAppActive } from "@/lib/store-advanced-settings";
import { recordStorePageView } from "@/lib/store-views";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    include: {
      products: {
        where: {
          status: "ACTIVE",
          showOnSite: true,
        },
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      categories: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        include: {
          children: {
            where: { active: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      pages: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      banners: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          imageUrl: true,
          title: true,
        },
      },
      storeTemplate: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!store) {
    notFound();
  }

  if (!store.active) {
    return <InactiveStorePage store={store} />;
  }
  const subscriptionCheck = await checkStoreSubscription(store.id);
  if (subscriptionCheck.isBlocked) {
    return <StoreTemporarilyUnavailable store={store} />;
  }

  const viewUsage = await recordStorePageView(store.id, `/store/${slug}`);
  if (viewUsage.blocked) {
    return <InactiveStorePage store={store} />;
  }

  const advancedSettings = await getStoreAdvancedSettings(store.id);

  const visibleProducts =
    isStoreAppActive(advancedSettings, "hide-out-stock") ||
    isStoreAppActive(advancedSettings, "soldout-listings")
      ? store.products.filter((product) => product.stock > 0 || product.allowOutOfStock)
      : store.products;

  return (
    <StorefrontRenderer
      store={{ ...store, products: visibleProducts }}
      advancedSettings={advancedSettings}
    />
  );
}
