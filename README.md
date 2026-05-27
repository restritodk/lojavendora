<div align="center">

# Vendora

**Plataforma SaaS multi-loja para criação, gestão e operação de e-commerces.**

Vendora reúne painel do lojista, painel do proprietário, loja pública, planos, limites, pagamentos, relatórios, produtos, pedidos, clientes, promoções e integrações em uma única base.

![Next.js](https://img.shields.io/badge/Next.js-111827?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-0f172a?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-17293f?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-1e293b?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-1d4ed8?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

## Visão Geral

O Vendora foi desenvolvido para permitir que diferentes lojistas criem e gerenciem suas próprias lojas virtuais dentro de uma arquitetura multi-tenant. Cada loja possui dados, configurações, produtos, pedidos, clientes, páginas, promoções e integrações isoladas por `storeId`.

A plataforma também inclui um painel administrativo para o proprietário controlar clientes lojistas, planos comerciais, limites, assinaturas e configurações globais.

---

## Principais Recursos

- **Multi-loja com isolamento por cliente**: cada operação é vinculada a uma loja específica.
- **Painel do lojista**: gestão de produtos, categorias, pedidos, clientes, relatórios e configurações.
- **Painel do proprietário**: administração de lojistas, planos, limites e integrações globais.
- **Loja pública**: páginas de vitrine, produto, categoria, checkout, login do cliente e pedidos.
- **Planos e limites**: controle por produtos, visitas, pedidos, usuários, armazenamento e recursos premium.
- **Pagamentos e faturas**: cobrança da plataforma com Pix/cartão via Mercado Pago.
- **Promoções e descontos**: atacado/varejo por produto, desconto por valor da compra e cupons.
- **Relatórios em PDF**: exportação de dados com informações da loja.
- **Uploads com R2/local**: suporte para Cloudflare R2 e armazenamento local em desenvolvimento.
- **Templates de loja**: estrutura preparada para diferentes segmentos e layouts.

---

## Arquitetura

```text
app/
  admin/              Painel do proprietário
  dashboard/          Painel do lojista
  store/[slug]/       Loja pública por slug
  api/                Rotas internas, webhooks e integrações

components/
  admin/              Componentes do painel proprietário
  dashboard/          Componentes do painel lojista
  store/              Componentes da loja pública
  ui/                 Componentes reutilizáveis

lib/
  auth.ts             Autenticação e sessão
  prisma.ts           Cliente Prisma
  plan-limits.ts      Regras de uso e limites dos planos
  store-subscription.ts Estado financeiro da assinatura
  platform-billing.ts Faturas e cobrança da plataforma
  uploads.ts          Upload local/R2

prisma/
  schema.prisma       Modelagem do banco de dados
```

---

## Stack Técnica

- **Next.js App Router**
- **React**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **Tailwind CSS**
- **Mercado Pago**
- **Cloudflare R2**
- **PDFKit**
- **Sharp**
- **bcryptjs**

---

## Regras Multi-Tenant

O Vendora segue uma regra central: nenhum dado de loja deve ser criado, lido, editado ou removido apenas por IDs globais.

Toda operação sensível deve considerar o `storeId` da loja atual:

- No painel, a loja é derivada do usuário autenticado.
- Na loja pública, a loja é resolvida pelo `slug`.
- Produtos, categorias, clientes, pedidos, páginas, configurações, promoções e integrações sempre devem ser filtrados por `storeId`.

---

## Como Rodar Localmente

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais necessárias para banco, autenticação, pagamentos e storage.

Para Cloudflare R2, use o arquivo `.env.r2.example` como referência.

### 3. Prepare o banco de dados

```bash
npx prisma generate
npx prisma db push
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação roda em:

```text
http://localhost:4100
```

---

## Scripts

```bash
npm run dev      # Inicia o servidor local
npm run build    # Gera build de produção
npm run start    # Inicia a aplicação em produção
npm run lint     # Executa o ESLint
```

---

## Módulos do Produto

### Painel do Lojista

- Dashboard com resumo da operação
- Cadastro e edição de produtos
- Categorias
- Pedidos manuais e pedidos da loja
- Clientes
- Relatórios
- Dados cadastrais
- Configurações da loja
- Usuários e permissões
- Promoções e cupons
- Pagamentos e faturas

### Painel do Proprietário

- Base de clientes lojistas
- Criação e edição de planos
- Regras de limite por plano
- Configuração de Mercado Pago
- Controle comercial da plataforma

### Loja Pública

- Página inicial da loja
- Listagem por categoria
- Página de produto
- Checkout
- Login do cliente
- Área de pedidos
- Páginas institucionais
- Bloqueio automático por inadimplência

---

## Planos e Assinaturas

A plataforma possui regras para planos gratuitos, pagos e ilimitados.

- Plano gratuito sem vencimento e sem fatura.
- Planos pagos com ciclo de cobrança de 30 dias.
- Período de tolerância após vencimento.
- Bloqueio automático do painel e da loja pública após inadimplência.
- Liberação automática após pagamento confirmado.
- Controle de limites por produtos, visitas, pedidos, usuários e recursos.

---

## Status do Projeto

O Vendora está em evolução ativa, com foco em transformar a plataforma em uma solução SaaS completa para lojistas, empreendedores e operações digitais.

---

## Autor

Desenvolvido por **Eurico Santos**.

[GitHub](https://github.com/restritodk)
