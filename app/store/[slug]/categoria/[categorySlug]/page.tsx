import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { CategoryProductList } from "@/components/store/templates/category-product-list";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { getStoreAdvancedSettings, isStoreAppActive } from "@/lib/store-advanced-settings";

export default async function StoreCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { slug, categorySlug } = await params;
  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    include: {
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

  const category = store.categories.find((item) => item.slug === categorySlug);

  if (!category?.active) {
    notFound();
  }

  const advancedSettings = await getStoreAdvancedSettings(store.id);
  const hideOutOfStock =
    isStoreAppActive(advancedSettings, "hide-out-stock") ||
    isStoreAppActive(advancedSettings, "soldout-listings");

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      categoryId: category.id,
      status: "ACTIVE",
      showOnSite: true,
      ...(hideOutOfStock ? { OR: [{ stock: { gt: 0 } }, { allowOutOfStock: true }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return (
    <CategoryProductList
      store={{ ...store, products }}
      category={category}
      products={products}
      advancedSettings={advancedSettings}
    />
  );
}
