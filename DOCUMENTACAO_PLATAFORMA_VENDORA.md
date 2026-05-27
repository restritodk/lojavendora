# Documentação da Plataforma Vendora

## Visão Geral

A Vendora é uma plataforma SaaS de e-commerce multi-loja. Cada cliente lojista possui seu próprio painel administrativo e seu próprio site público, com dados, configurações, produtos, pedidos, clientes, banners, páginas, aplicativos e notificações isolados por loja.

O objetivo principal da plataforma é permitir que vários lojistas usem o mesmo sistema sem que uma loja altere, visualize ou afete as informações de outra.

## Isolamento Por Loja

Toda configuração e toda operação da plataforma deve ser vinculada a uma loja específica por `storeId`.

Isso significa que:

- Cada cliente acessa somente o painel da própria loja.
- Cada loja possui seu próprio site público.
- Produtos, categorias, clientes, pedidos, banners, páginas, notificações, aplicativos e integrações são separados por loja.
- Alterações feitas no painel de um cliente refletem somente no site desse mesmo cliente.
- Nenhuma alteração feita por um lojista pode afetar painel, site, produtos, pedidos ou configurações de outro lojista.

No painel, a loja é identificada pelo usuário autenticado. No site público, a loja é identificada pelo `subdomain` ou slug da rota pública.

## Painel Administrativo Do Lojista

Cada lojista possui um painel individual para gerenciar sua loja.

Principais áreas implementadas:

- Configurações gerais da loja.
- Aparência da loja e escolha de tema.
- Produtos e categorias.
- Clientes.
- Pedidos manuais e listagem de pedidos.
- Carrinho abandonado com bloqueio por plano.
- Notas fiscais com bloqueio por plano.
- Funções avançadas.
- Aplicativos e integrações.
- Páginas da loja.
- Notificações.

Todas essas áreas devem consultar e alterar dados usando o `storeId` da loja do cliente autenticado.

## Site Público Do Cliente

Cada loja possui um site público individual.

O site público usa as configurações da própria loja, incluindo:

- Nome da loja.
- Logo.
- Tema escolhido.
- Cores do tema.
- Produtos ativos.
- Categorias ativas.
- Páginas personalizadas.
- Banners ativos.
- Aplicativos ativos.
- Status de loja ativa ou inativa.

Se a loja estiver inativa, o comprador visualiza uma página profissional informando que a loja está temporariamente indisponível. Quando o lojista ativa a loja novamente, o site volta ao funcionamento normal.

## Configurações Gerais

A tela de Configurações Gerais controla informações principais da loja.

Campos principais:

- Loja ativa.
- Título da loja.
- Link temporário da loja.
- URL da logo.
- Banners da loja.

Os campos antigos de texto do banner foram removidos da tela. O banner agora é gerenciado pela seção "Banners da loja".

## Banners Da Loja

Cada loja pode cadastrar vários banners individualmente.

Funcionalidades:

- Adicionar banner por upload de imagem.
- Adicionar banner por link de imagem.
- Ativar ou desativar banner.
- Excluir banner.
- Exibir somente banners ativos no site público.
- Trocar banners automaticamente a cada 3 segundos.
- Navegar manualmente usando setas e indicadores.
- Efeito de slider horizontal da direita para a esquerda.

Tamanho recomendado do banner:

- Ideal: 1920 x 500 px.
- Alternativas: 1920 x 480 px ou 1920 x 600 px.
- Proporção recomendada: aproximadamente 4:1.

Os banners são salvos por loja no modelo `StoreBanner`, sempre vinculados ao `storeId`.

## Páginas Da Loja

Cada lojista pode criar páginas personalizadas para o próprio site.

Funcionalidades:

- Criar página.
- Editar página.
- Ativar ou desativar página.
- Excluir página.
- Exibir páginas ativas no rodapé do site.

Cada página pertence somente à loja que a criou. O slug da página é único dentro da mesma loja, não entre todas as lojas.

## Notificações

A plataforma possui notificações configuráveis por loja.

O lojista pode ativar ou desativar tipos de notificações no painel. As notificações aparecem no sino do dashboard, com contador de não lidas e acesso para a tela completa de notificações.

Exemplos de notificações:

- Novo cliente.
- Pedido acima de determinado valor.
- Pagamento aprovado.
- Pedido entregue.
- Estoque crítico.

As notificações são criadas e exibidas somente para a loja correspondente.

## Funções Avançadas

As Funções Avançadas permitem ativar recursos extras por loja.

Cada função possui:

- Status ativo ou inativo.
- Configuração individual.
- Regras de plano quando aplicável.
- Aplicação somente no site da loja correspondente.

As configurações são salvas por `storeId` e `featureId`.

## Aplicativos E Integrações

A área de Aplicativos permite ativar, configurar, testar e sincronizar integrações.

Cada aplicativo pode ter:

- Status ativo ou inativo.
- Configurações públicas.
- Credenciais sensíveis criptografadas.
- Teste de conexão.
- Sincronização manual.
- Efeitos no site público.

Aplicativos ativos aparecem na seção "Aplicativos ativos". Quando desativados, retornam para sua categoria original.

As integrações são individuais por loja. Chaves, tokens e configurações de um cliente não são compartilhados com outros clientes.

## Segurança Das Integrações

Credenciais sensíveis são armazenadas separadamente e criptografadas.

Foram criadas estruturas para:

- Segredos de integração.
- Logs de integração.
- Webhooks.
- Catálogo central de aplicativos.
- Serviços de sincronização.
- Feeds públicos por loja.

Toda integração deve sempre receber e validar o `storeId`.

## Pedidos

A plataforma permite gerenciar pedidos vindos do site e também criar pedidos manualmente no painel.

Funcionalidades:

- Criar pedido manual.
- Buscar cliente por digitação.
- Buscar produto por digitação.
- Adicionar quantidade.
- Calcular valores corretamente.
- Exibir pedido no histórico do comprador.
- Atualizar status com fluxo controlado.
- Disparar notificações e integrações conforme o status.

Pedidos pertencem exclusivamente à loja em que foram criados.

## Produtos E Categorias

Produtos e categorias são isolados por loja.

Categorias podem ser ativas, inativas e destacadas. Subcategorias pertencem a uma categoria principal.

O site público exibe somente produtos e categorias da loja acessada.

## Planos E Bloqueios

Algumas áreas possuem bloqueio por plano.

Exemplos:

- Carrinho abandonado disponível apenas para planos acima de Loja Mais.
- Notas fiscais disponíveis para Loja Completa e Loja Ilimitada.
- Envio de e-mails liberado conforme plano.

O bloqueio deve ser visual no painel e também validado no servidor.

## Loja Ativa Ou Inativa

Cada lojista pode ativar ou desativar sua loja.

Quando a loja está ativa:

- O site público funciona normalmente.
- Produtos, categorias, páginas, banners e aplicativos aparecem conforme configuração.

Quando a loja está inativa:

- O site público exibe uma página elegante de indisponibilidade.
- Os dados da loja continuam preservados.
- Ao reativar, o site volta ao estado normal.

## Cache E Atualização Do Site

Após alterações no painel, as rotas públicas da loja são revalidadas para que o site reflita as mudanças.

Exemplos de alterações que revalidam o site:

- Configurações gerais.
- Banners.
- Páginas da loja.
- Aplicativos.
- Status ativo ou inativo.

## Regra Principal De Desenvolvimento

Qualquer nova funcionalidade deve seguir a regra de isolamento multi-loja:

Nunca buscar, criar, atualizar ou excluir dados de painel sem filtrar pelo `storeId` da loja autenticada.

Nunca aplicar configuração no site público sem identificar a loja pela rota pública.

Nunca compartilhar dados, configurações, integrações, banners, páginas, produtos, pedidos ou notificações entre lojas.

## Resumo

A Vendora atua como uma plataforma única para múltiplas lojas, mas cada cliente tem uma experiência isolada:

- Painel administrativo individual.
- Site público individual.
- Configurações individuais.
- Banners individuais.
- Aplicativos individuais.
- Produtos, clientes e pedidos individuais.
- Notificações individuais.
- Integrações e credenciais individuais.

Alterações feitas por um cliente afetam apenas a loja desse cliente.
