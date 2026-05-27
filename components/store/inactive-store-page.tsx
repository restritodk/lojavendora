import Link from "next/link";

type InactiveStore = {
  name: string;
  subdomain: string;
  description?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
};

export function InactiveStorePage({ store }: { store: InactiveStore }) {
  const primaryColor = store.primaryColor ?? "#0f172a";
  const accentColor = store.accentColor ?? "#38bdf8";

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl place-items-center">
        <div className="w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          <div
            className="relative overflow-hidden px-8 py-12 text-center text-white"
            style={{ background: primaryColor }}
          >
            <div
              className="absolute -left-16 -top-16 size-44 rounded-full opacity-30"
              style={{ background: accentColor }}
            />
            <div
              className="absolute -bottom-20 -right-16 size-56 rounded-full opacity-20"
              style={{ background: accentColor }}
            />
            <div className="relative">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="mx-auto h-20 max-w-56 rounded-2xl object-contain"
                />
              ) : (
                <div
                  className="mx-auto grid size-20 place-items-center rounded-2xl text-3xl font-black"
                  style={{ background: accentColor }}
                >
                  {store.name.charAt(0)}
                </div>
              )}
              <p className="mt-8 text-sm font-black uppercase tracking-[0.26em] text-white/65">
                Loja temporariamente indisponível
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                {store.name} está em manutenção.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/75">
                Estamos ajustando a loja para oferecer uma experiência melhor.
                Volte em breve para conferir novidades, produtos e ofertas.
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-8 text-center md:grid-cols-3 md:text-left">
            <InfoCard
              title="Atendimento"
              text="Se precisar falar com a loja, use os canais oficiais de contato."
            />
            <InfoCard
              title="Pedidos"
              text="Pedidos já realizados continuam sendo tratados pela equipe da loja."
            />
            <InfoCard
              title="Retorno"
              text="Assim que a loja for reativada, o site voltará ao funcionamento normal."
            />
          </div>

          <div className="border-t border-slate-100 px-8 py-6 text-center">
            <Link
              href={`/store/${store.subdomain}`}
              className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
            >
              Tentar novamente
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <h2 className="font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </article>
  );
}
