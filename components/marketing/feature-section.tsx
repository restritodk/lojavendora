import Link from "next/link";
import { vendoraPlans } from "@/lib/plans";

const features = [
  ["Multi-lojas", "Gerencie várias marcas, domínios e catálogos."],
  ["Operação simples", "Acompanhe pedidos, clientes e produtos."],
  ["Receita recorrente", "Estrutura pronta para planos SaaS."],
];

export function FeatureSection() {
  return (
    <section
      id="recursos"
      className="border-y border-white/10 bg-white/[0.03] px-6 py-16 sm:px-8 lg:px-12"
    >
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
        {features.map(([title, description]) => (
          <article
            key={title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"
          >
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-3 text-slate-400">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PlanSection() {
  return (
    <section id="planos" className="px-6 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            Planos Vendora
          </span>
          <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
            Escolha o plano certo para lançar e escalar sua loja.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            Limites claros, estrutura para promoções e autonomia para ajustar
            preços, recursos e quantidades pelo painel administrativo.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          {vendoraPlans.map((plan) => (
            <article
              key={plan.slug}
              className={`relative flex rounded-[2rem] border p-5 transition hover:-translate-y-1 hover:shadow-2xl ${
                plan.highlighted
                  ? "border-emerald-300 bg-emerald-300 text-slate-950 shadow-emerald-950/30"
                  : "border-white/10 bg-white/[0.04] text-white shadow-black/20"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Mais escolhido
                </span>
              ) : null}

              <div className="flex w-full flex-col">
                <p
                  className={`text-sm font-bold ${
                    plan.highlighted ? "text-slate-700" : "text-emerald-300"
                  }`}
                >
                  {plan.name}
                </p>
                <strong className="mt-4 block text-3xl tracking-tight">
                  {plan.priceLabel}
                </strong>
                <p
                  className={`mt-4 text-sm leading-6 ${
                    plan.highlighted ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span
                        className={`mt-1 size-2 rounded-full ${
                          plan.highlighted ? "bg-slate-950" : "bg-emerald-300"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${plan.slug}`}
                  className={`mt-8 block rounded-full px-5 py-3 text-center text-sm font-black transition ${
                    plan.highlighted
                      ? "bg-slate-950 text-white hover:bg-slate-800"
                      : "bg-white text-slate-950 hover:bg-emerald-200"
                  }`}
                >
                  Faça seu cadastro
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-slate-500">
          As regras de limite ficam vinculadas ao plano: produtos e visitas são
          controlados por plano para evitar uso acima do contratado.
        </p>
      </div>
    </section>
  );
}
