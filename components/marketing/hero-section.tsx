import Link from "next/link";

const features = [
  "Multi-lojas com subdomínio próprio",
  "Produtos, categorias e pedidos em um só painel",
  "Base pronta para planos e assinaturas",
];

const stats = [
  { label: "lojas gerenciadas", value: "120+" },
  { label: "pedidos processados", value: "48k" },
  { label: "uptime da plataforma", value: "99.9%" },
];

export function HeroSection() {
  return (
    <div className="mx-auto grid max-w-7xl items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
      <div>
        <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-200">
          SaaS de e-commerce para marcas modernas
        </span>
        <h1 className="mt-8 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Crie, venda e gerencie múltiplas lojas em uma única plataforma.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          A Vendora reúne vitrine, catálogo, pedidos, clientes e assinatura em
          uma base escalável para você lançar seu marketplace SaaS com
          velocidade.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-white px-7 py-4 text-center text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/15 px-7 py-4 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Ver painel demo
          </Link>
        </div>
      </div>

      <div
        id="demo"
        className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur"
      >
        <div className="rounded-[1.5rem] bg-slate-950 p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="text-sm text-slate-400">Loja ativa</p>
              <h2 className="text-2xl font-bold">minhaloja.lojavendora.com.br</h2>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">
              Online
            </span>
          </div>

          <div className="grid gap-4 py-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <strong className="text-2xl">{stat.value}</strong>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
              >
                <span>{feature}</span>
                <span className="text-emerald-300">Pronto</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
