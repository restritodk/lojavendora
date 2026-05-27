import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { ProductDetailRenderer } from "@/components/store/templates/registry";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
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
      products: {
        where: {
          slug: productSlug,
          status: "ACTIVE",
          showOnSite: true,
        },
        include: {
          category: true,
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
        take: 1,
      },
    },
  });

  const product = store?.products[0];

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

  if (!product) {
    notFound();
  }

  const [relatedProducts, reviews] = await Promise.all([
    prisma.product.findMany({
    where: {
      storeId: store.id,
      id: { not: product.id },
      status: "ACTIVE",
      showOnSite: true,
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    }),
    prisma.productReview.findMany({
      where: {
        storeId: store.id,
        productId: product.id,
        approved: true,
        visible: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
        attachments: {
          select: {
            id: true,
            url: true,
            type: true,
          },
        },
      },
    }),
  ]);
  const advancedSettings = await getStoreAdvancedSettings(store.id);

  return (
    <ProductDetailRenderer
      store={store}
      product={{ ...product, reviews }}
      relatedProducts={relatedProducts}
      advancedSettings={advancedSettings}
    />
  );
}
