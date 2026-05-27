import Link from "next/link";

export function SiteHeader() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Vendora
      </Link>
      <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        <a href="#recursos" className="hover:text-white">
          Recursos
        </a>
        <a href="#planos" className="hover:text-white">
          Planos
        </a>
        <a href="#demo" className="hover:text-white">
          Demo
        </a>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:block"
        >
          Entrar
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Começar
        </Link>
      </div>
    </nav>
  );
}
