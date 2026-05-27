type UpgradePlanCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  requiredPlan?: string;
  benefits?: string[];
  buttonLabel?: string;
  href?: string;
  icon?: string;
};

export function UpgradePlanCard({
  eyebrow,
  title,
  description,
  requiredPlan,
  benefits = [],
  buttonLabel = "Alterar Plano",
  href = "/dashboard#planos-upgrade",
  icon = "👕",
}: UpgradePlanCardProps) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔗</span>
          <div>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <p className="text-sm text-slate-500">Recurso disponível para planos superiores.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 lg:grid-cols-[0.9fr_1fr] lg:p-10">
        <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-[1.5rem] bg-slate-50">
          <div className="absolute -left-12 top-8 rotate-[-45deg] bg-red-500 px-14 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg">
            Opção bloqueada
          </div>
          <span className="text-6xl">{icon}</span>
        </div>

        <div className="flex flex-col justify-center">
          {eyebrow || requiredPlan ? (
            <p className="text-sm font-black text-cyan-700">
              {eyebrow ?? `Exclusivo para planos ${requiredPlan} ou superior`}
            </p>
          ) : null}
          <h3 className="mt-2 text-3xl font-black text-slate-950">{title}</h3>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">{description}</p>

          {benefits.length ? (
            <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-600">
              {benefits.map((benefit) => (
                <p key={benefit}>✓ {benefit}</p>
              ))}
            </div>
          ) : null}

          <a
            href={href}
            className="mt-7 inline-flex w-fit rounded-xl bg-[#17293f] px-7 py-4 text-sm font-black text-white transition hover:bg-[#0f1f31]"
          >
            {buttonLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
