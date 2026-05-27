import Link from "next/link";
import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import {
  STORE_REGISTRATION_FEATURE_ID,
  normalizeStoreRegistrationValues,
} from "@/lib/store-registration";

export default async function StoreContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    include: {
      advancedSettings: {
        where: { featureId: STORE_REGISTRATION_FEATURE_ID },
        select: { values: true },
        take: 1,
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

  const values = normalizeStoreRegistrationValues(store.advancedSettings[0]?.values);
  const contacts = [
    ["Telefone", values.phone],
    ["WhatsApp", values.whatsapp],
    ["E-mail", values.contactEmail || values.email],
    ["Horário de atendimento", values.serviceHours],
    ["Endereço", values.physicalAddress || formatAddress(values)],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 shadow-xl">
        <Link href={`/store/${store.subdomain}`} className="text-sm font-bold text-emerald-600">
          {store.name}
        </Link>
        <h1 className="mt-4 text-4xl font-black">Contato</h1>
        <p className="mt-3 text-slate-500">
          Fale com a loja pelos canais oficiais abaixo.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {contacts.length > 0 ? contacts.map(([label, value]) => (
            <article key={label} className="rounded-3xl border border-slate-200 p-6">
              <h2 className="font-black">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{value}</p>
            </article>
          )) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800 md:col-span-2">
              Esta loja ainda não informou canais de contato.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatAddress(values: ReturnType<typeof normalizeStoreRegistrationValues>) {
  return [
    values.street,
    values.number,
    values.neighborhood,
    values.city,
    values.state,
    values.zipCode,
  ].filter(Boolean).join(", ");
}

