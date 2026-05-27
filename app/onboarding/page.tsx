import { redirect } from "next/navigation";
import { completeOnboardingAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import {
  getBusinessCategoriesWithTemplates,
  getUserPrimaryStore,
} from "@/lib/onboarding";

export default async function OnboardingPage() {
  const user = await requireUser();

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const [store, categories] = await Promise.all([
    getUserPrimaryStore(user.id),
    getBusinessCategoriesWithTemplates(),
  ]);

  if (!store) {
    redirect("/register");
  }

  if (store.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-300">Vendora</p>
            <h1 className="mt-2 text-3xl font-black">Escolha o ramo da loja</h1>
          </div>
          <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400">
            {store.name}
          </span>
        </header>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,#10b98130,transparent_32%),linear-gradient(135deg,#111827,#0f172a)] p-8">
          <h2 className="max-w-3xl text-5xl font-black tracking-tight">
            Vamos criar sua loja quase pronta automaticamente.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Escolha o ramo do negócio. A Vendora aplicará cores, banner,
            categorias e produtos exemplo para você começar mais rápido.
          </p>
        </section>

        <form action={completeOnboardingAction} className="mt-10">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const template = category.templates[0];

              if (!template) {
                return null;
              }

              return (
                <label
                  key={category.id}
                  className="group cursor-pointer"
                >
                  <input
                    type="radio"
                    name="templateId"
                    value={template.id}
                    required
                    className="peer sr-only"
                  />
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-white/[0.07] peer-checked:border-emerald-300 peer-checked:bg-emerald-300/10 peer-checked:ring-4 peer-checked:ring-emerald-300/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-black">{category.name}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {category.description}
                        </p>
                      </div>
                      <span className="size-5 rounded-full border border-slate-600 transition group-has-[:checked]:border-emerald-300 group-has-[:checked]:bg-emerald-300" />
                    </div>

                    <div
                      className="mt-6 rounded-2xl p-5 text-white"
                      style={{
                        background: `linear-gradient(135deg, ${template.primaryColor}, ${template.accentColor})`,
                      }}
                    >
                      <p className="text-sm opacity-80">{template.name}</p>
                      <h3 className="mt-2 text-2xl font-black">
                        {template.bannerTitle}
                      </h3>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {template.defaultCategories.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <button className="mt-8 rounded-full bg-emerald-400 px-8 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300">
            Aplicar modelo e entrar no painel
          </button>
        </form>
      </div>
    </main>
  );
}
