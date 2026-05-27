import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard
      eyebrow="Bem-vindo"
      title="Controle sua loja sem perder o ritmo das vendas."
      description="Acesse pedidos, produtos, clientes e indicadores em poucos cliques."
    >
      <LoginForm error={error} />
    </AuthCard>
  );
}
