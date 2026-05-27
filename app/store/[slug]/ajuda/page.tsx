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

export default async function StoreHelpPage({
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
  const registration = normalizeStoreRegistrationValues(store.advancedSettings[0]?.values);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-5xl rounded-[2rem] bg-white p-8 shadow-xl">
        <Link href={`/store/${store.subdomain}`} className="text-sm font-bold text-emerald-600">
          {store.name}
        </Link>
        <h1 className="mt-4 text-4xl font-black">Central de ajuda</h1>
        <p className="mt-3 text-slate-500">
          Tire dúvidas sobre compras, entregas, pagamentos e trocas.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["Como acompanho meu pedido?", "Acesse Meus pedidos e consulte o status da compra."],
            ["Como falar com a loja?", "Use os canais de contato informados no rodapé."],
            ["Posso trocar um produto?", "A política de troca será configurada pelo lojista."],
            ["Quais formas de pagamento?", "Cartão, Pix e boleto serão exibidos no checkout."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-3xl border border-slate-200 p-6">
              <h2 className="font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-cyan-100 bg-cyan-50 p-6">
          <h2 className="font-black text-cyan-950">Contato da loja</h2>
          <div className="mt-4 grid gap-3 text-sm text-cyan-900 md:grid-cols-2">
            {registration.phone ? <p><strong>Telefone:</strong> {registration.phone}</p> : null}
            {registration.whatsapp ? <p><strong>WhatsApp:</strong> {registration.whatsapp}</p> : null}
            {registration.serviceHours ? <p><strong>Horário:</strong> {registration.serviceHours}</p> : null}
            {registration.contactEmail ? <p><strong>E-mail:</strong> {registration.contactEmail}</p> : null}
            {registration.physicalAddress ? <p className="md:col-span-2"><strong>Endereço:</strong> {registration.physicalAddress}</p> : null}
          </div>
          <Link href={`/store/${store.subdomain}/contato`} className="mt-5 inline-flex rounded-full bg-cyan-700 px-5 py-3 text-sm font-black text-white">
            Ver página de contato
          </Link>
        </div>
      </section>
    </main>
  );
}
