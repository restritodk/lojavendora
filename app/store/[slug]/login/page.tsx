import { notFound, redirect } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { CustomerLoginPanel } from "./customer-login-panel";

export default async function StoreCustomerLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const store = await prisma.store.findUnique({ where: { subdomain: slug } });

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

  const customer = await getCurrentCustomer(store.id);

  const returnTo = sanitizeReturnTo(store.subdomain, query.returnTo);

  if (customer) {
    redirect(returnTo);
  }

  return (
    <CustomerLoginPanel
      store={{
        name: store.name,
        subdomain: store.subdomain,
      }}
      returnTo={returnTo}
      error={query.error}
    />
  );
}

function sanitizeReturnTo(slug: string, value: string | undefined) {
  if (!value || !value.startsWith(`/store/${slug}/`)) {
    return `/store/${slug}/pedidos`;
  }

  return value;
}
