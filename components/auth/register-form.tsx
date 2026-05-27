import { registerAction } from "@/lib/actions";

type RegisterFormProps = {
  error?: string;
};

const errorMessages: Record<string, string> = {
  "invalid-fields": "Preencha todos os campos. A senha precisa ter 8 caracteres.",
  "email-in-use": "Este e-mail já está cadastrado.",
  "subdomain-in-use": "Este subdomínio já está em uso.",
};

export function RegisterForm({ error }: RegisterFormProps) {
  return (
    <form
      action={registerAction}
      className="rounded-[2.25rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-xl sm:p-8 lg:p-10"
    >
      <div className="flex flex-col gap-2 border-b border-white/10 pb-6">
        <span className="text-sm font-bold text-emerald-300">
          Cadastro do lojista
        </span>
        <h2 className="text-3xl font-black tracking-tight">Criar conta</h2>
        <p className="text-sm leading-6 text-slate-400">
          Dados iniciais para configurar o acesso, a loja e o subdomínio público.
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {errorMessages[error] ?? "Não foi possível criar a conta."}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-slate-200">
            Nome completo
          </span>
          <input
            name="name"
            type="text"
            placeholder="Seu nome"
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 text-base text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">E-mail</span>
          <input
            name="email"
            type="email"
            placeholder="voce@empresa.com"
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 text-base text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">Senha</span>
          <input
            name="password"
            type="password"
            placeholder="Mínimo de 8 caracteres"
            minLength={8}
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 text-base text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Nome da loja
          </span>
          <input
            name="storeName"
            type="text"
            placeholder="Minha loja"
            required
            className="mt-3 h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 text-base text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">Subdomínio</span>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 transition hover:border-slate-600 focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-300/10">
            <input
              name="subdomain"
              type="text"
              placeholder="minhaloja"
              required
              className="h-14 w-full bg-transparent px-5 text-base text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Sua loja ficará em{" "}
            <span className="text-emerald-300">
              minhaloja.lojavendora.com.br
            </span>
          </p>
        </label>
      </div>

      <button
        type="submit"
        className="mt-8 h-14 w-full rounded-2xl bg-emerald-400 px-5 text-base font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-300"
      >
        Criar minha loja
      </button>
    </form>
  );
}
