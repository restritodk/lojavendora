import Link from "next/link";
import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { GiftGoalBanner, StoreAppEffects } from "@/components/store/store-app-effects";
import { TemplateFooter, TemplateHeader } from "@/components/store/templates/shared";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { getStoreAdvancedSettings } from "@/lib/store-advanced-settings";

export default async function StoreCustomPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
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

  const page = await prisma.storePage.findFirst({
    where: {
      storeId: store.id,
      slug: pageSlug,
      active: true,
    },
    select: {
      title: true,
      description: true,
      content: true,
      updatedAt: true,
    },
  });

  if (!page) {
    notFound();
  }

  const advancedSettings = await getStoreAdvancedSettings(store.id);
  const safeHtml = sanitizePageHtml(page.content);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <TemplateHeader store={{ ...store, products: [] }} />
      <GiftGoalBanner advancedSettings={advancedSettings} />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="mb-8 text-sm text-slate-500">
          <Link href={`/store/${store.subdomain}`} className="font-bold text-cyan-700">
            Início
          </Link>
          {" / "}
          <span>{page.title}</span>
        </div>

        <article className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            {store.name}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">{page.title}</h1>
          {page.description ? (
            <p className="mt-4 text-lg leading-8 text-slate-500">{page.description}</p>
          ) : null}
          <div className="mt-8 border-t border-slate-100 pt-8">
            <div
              className="prose prose-slate max-w-none leading-8 text-slate-700"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          </div>
        </article>
      </section>
      <TemplateFooter store={{ ...store, products: [] }} />
      <StoreAppEffects advancedSettings={advancedSettings} />
    </main>
  );
}

function sanitizePageHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\sjavascript:/gi, "");
}
