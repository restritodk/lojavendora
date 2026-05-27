type StoreUnavailable = {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
};

export function StoreTemporarilyUnavailable({ store }: { store: StoreUnavailable }) {
  const primaryColor = store.primaryColor ?? "#17293f";
  const accentColor = store.accentColor ?? "#06b6d4";

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-4xl place-items-center">
        <div className="w-full overflow-hidden rounded-[2rem] bg-white text-center shadow-2xl">
          <div className="relative overflow-hidden px-8 py-14 text-white" style={{ background: primaryColor }}>
            <div className="absolute -left-16 -top-16 size-44 rounded-full opacity-30" style={{ background: accentColor }} />
            <div className="absolute -bottom-20 -right-16 size-56 rounded-full opacity-20" style={{ background: accentColor }} />
            <div className="relative">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt={store.name} className="mx-auto h-20 max-w-56 rounded-2xl object-contain" />
              ) : (
                <div className="mx-auto grid size-20 place-items-center rounded-2xl text-3xl font-black" style={{ background: accentColor }}>
                  {store.name.charAt(0)}
                </div>
              )}
              <p className="mt-8 text-sm font-black uppercase tracking-[0.26em] text-white/65">
                Loja temporariamente fora do ar
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                Esta loja está temporariamente fora do ar.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/75">
                Estamos aguardando a regularização da assinatura para reativar a loja automaticamente.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
