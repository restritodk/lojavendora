import Link from "next/link";

type AuthCardProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthCard({
  children,
  eyebrow,
  title,
  description,
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,#10b9812b,transparent_30%)]" />

      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur lg:grid-cols-2">
        <div className="hidden bg-gradient-to-br from-emerald-400 to-cyan-400 p-10 text-slate-950 lg:block">
          <Link href="/" className="text-2xl font-black">
            Vendora
          </Link>
          <div className="mt-24">
            <p className="text-sm font-bold uppercase tracking-[0.3em]">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight">{title}</h1>
            <p className="mt-6 text-lg text-slate-800">{description}</p>
          </div>
        </div>

        <div className="p-8 sm:p-10">{children}</div>
      </section>
    </main>
  );
}
