import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#10b98124,transparent_34%),radial-gradient(circle_at_bottom_right,#38bdf824,transparent_28%)]" />

      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-2xl font-black">
          Vendora
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Entrar
        </Link>
      </div>

      <section className="mx-auto grid max-w-7xl items-center gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            Comece em poucos minutos
          </span>
          <h1 className="mt-8 max-w-2xl text-5xl font-black tracking-tight sm:text-6xl">
            Lance sua primeira loja com a Vendora.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Crie uma conta, cadastre sua loja e prepare o catálogo para vender
            com uma experiência moderna.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:max-w-2xl">
            {[
              ["Subdomínio único", "Sua loja em lojavendora.com.br"],
              ["Painel completo", "Produtos, pedidos e clientes"],
              ["Planos SaaS", "Limites e upgrades por assinatura"],
            ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-sm font-bold text-slate-100">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <RegisterForm error={error} />
      </section>
    </main>
  );
}
