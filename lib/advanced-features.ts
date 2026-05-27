export type AdvancedFieldKind = "toggle" | "checkboxes" | "radio" | "input" | "select" | "textarea" | "code";

export type AdvancedFeatureCategory = "Conversão" | "Produto" | "Pedido" | "Marketing/SEO" | "Segurança" | "Checkout";

export type AdvancedField = {
  kind: AdvancedFieldKind;
  label: string;
  name: string;
  help?: string;
  unit?: string;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  defaultChecked?: boolean;
};

export type AdvancedFeature = {
  id: string;
  title: string;
  icon: string;
  description: string;
  active: boolean;
  info: string;
  fields: AdvancedField[];
  warning?: string;
  category: AdvancedFeatureCategory;
  impactLabel: string;
  minimumPlanSlug: string;
};

export type AdvancedFeatureGroup = {
  title: string;
  description: string;
  features: AdvancedFeature[];
};

export const advancedFeatureGroups: AdvancedFeatureGroup[] = [
  {
    title: "Essenciais para conversão",
    description: "Recursos que ajudam o comprador a navegar, comprar e retornar ao checkout.",
    features: [
      feature("abandoned-cart", "Habilitar Carrinho abandonado", "🛒", true, "Conversão", "Recuperação", "loja-gratis", [
        { kind: "toggle", label: "Ativo", name: "active", defaultChecked: true },
        { kind: "input", label: "Tempo para envio de e-mail", name: "hours", defaultValue: "24", unit: "Horas" },
      ], "Ative o carrinho abandonado em sua loja e defina qual o tempo para envio do e-mail de alerta."),
      feature("cash-price", "Ativar preço à vista em destaque", "💲", true, "Conversão", "Preço", "loja-gratis", [
        { kind: "toggle", label: "Ativar preço à vista em destaque na tela de produto", name: "cashPrice", defaultChecked: true },
      ]),
      feature("freight-product", "Mostrar cálculo de frete no produto", "🚚", true, "Conversão", "Frete", "loja-gratis", [
        { kind: "toggle", label: "Opção de cálculo de frete no produto", name: "freightProduct", defaultChecked: true },
      ]),
      feature("quantity-choice", "Permitir escolher quantidade", "➕", true, "Conversão", "Carrinho", "loja-gratis", [
        { kind: "checkboxes", label: "Escolher quantidade na compra", name: "quantityChoice", options: ["Exibir a seleção de quantidade na tela de detalhes do produto", "Exibir a seleção de quantidade na tela do carrinho"] },
      ]),
      feature("floating-buy", "Habilitar compra flutuante", "☰", true, "Conversão", "Produto", "loja-inicial", [
        { kind: "toggle", label: "Exibir compra flutuante na tela de produto", name: "floatingBuy", defaultChecked: true },
      ]),
      feature("related-cart", "Exibir relacionados no carrinho", "🧩", false, "Conversão", "Upsell", "loja-inicial", [
        { kind: "toggle", label: "Exibir produtos relacionados no carrinho", name: "relatedCart", defaultChecked: true },
      ], "Exiba no carrinho produtos relacionados à compra do cliente e estimule-o a comprar mais."),
      feature("buy-listing", "Ativar comprar direto da listagem", "🛍️", false, "Conversão", "Listagem", "loja-mais", [
        { kind: "toggle", label: "Comprar direto da listagem", name: "buyListing", defaultChecked: true },
        { kind: "toggle", label: "Desativar esta opção em dispositivos móveis", name: "disableMobile", defaultChecked: false },
      ], undefined, "Esta função se aplica somente em produtos configurados com quantidade mínima de uma unidade."),
    ],
  },
  {
    title: "Produto e catálogo",
    description: "Campos e regras que afetam produto, vitrine, estoque e dados comerciais.",
    features: [
      feature("variation-photo", "Trocar foto pela variação", "🖼️", true, "Produto", "Variação", "loja-gratis", [
        { kind: "toggle", label: "Trocar a foto do produto pela variação", name: "variationPhoto", defaultChecked: true },
      ]),
      feature("soldout-listings", "Exibir produto esgotado", "🛒", true, "Produto", "Estoque", "loja-gratis", [
        { kind: "toggle", label: "Exibir produto esgotado nas listagens", name: "soldoutListings", defaultChecked: true },
      ]),
      feature("hide-out-stock", "Não exibir produtos sem estoque", "🛒", false, "Produto", "Estoque", "loja-inicial", [
        { kind: "toggle", label: "Esconder produtos sem estoque", name: "hideOutStock", defaultChecked: true },
      ], "Escolha se deseja não exibir na loja os produtos que não possuem estoque."),
      feature("stock-visible", "Mostrar estoque no produto", "📦", false, "Produto", "Estoque", "loja-inicial", [
        { kind: "toggle", label: "Exibir estoque na tela do produto e carrinho", name: "stockVisible", defaultChecked: true },
      ]),
      feature("zoom", "Habilitar zoom nas fotos", "🔎", false, "Produto", "Imagem", "loja-inicial", [
        { kind: "toggle", label: "Habilitar zoom nas fotos dos produtos", name: "zoom", defaultChecked: true },
      ]),
      feature("gtin", "Habilitar campo GTIN/EAN", "GTIN", false, "Produto", "Google Shopping", "loja-mais", [
        { kind: "toggle", label: "Habilitar campo GTIN/EAN Google Shopping na tela de produto", name: "gtin", defaultChecked: true },
        { kind: "toggle", label: "Habilitar campo Identificador existente", name: "identifier", defaultChecked: false },
      ]),
      feature("ncm", "Habilitar campo NCM", "NCM", false, "Produto", "Fiscal", "loja-mais", [
        { kind: "toggle", label: "Habilitar campo NCM na tela de produto", name: "ncm", defaultChecked: true },
      ]),
      feature("mpn", "Habilitar campo MPN", "MPN", false, "Produto", "Marketplace", "loja-mais", [
        { kind: "toggle", label: "Habilitar campo MPN na tela de produto", name: "mpn", defaultChecked: true },
      ]),
      feature("cest", "Habilitar campo CEST", "CEST", false, "Produto", "Fiscal", "loja-mais", [
        { kind: "toggle", label: "Habilitar campo CEST na tela de produto", name: "cest", defaultChecked: true },
      ]),
      feature("adult-products", "Campo Produtos Adultos", "18", false, "Produto", "Google Shopping", "loja-completa", [
        { kind: "toggle", label: "Habilitar campo Produtos Adultos do Google Shopping", name: "adultProducts", defaultChecked: true },
      ]),
    ],
  },
  {
    title: "Pedido e checkout",
    description: "Controle regras do pedido, checkout, estoque e mensagens de finalização.",
    features: [
      feature("person-type", "Habilitar vendas PF/PJ", "👥", true, "Checkout", "Cadastro", "loja-gratis", [
        { kind: "checkboxes", label: "Tipos de comprador", name: "personType", options: ["Habilitar vendas para Pessoa Física", "Habilitar vendas para Pessoa Jurídica"] },
      ]),
      feature("privacy", "Política de privacidade e cookies", "▤", false, "Segurança", "LGPD", "loja-gratis", [
        { kind: "toggle", label: "Exibir box informativo", name: "privacyBox", defaultChecked: true },
        { kind: "input", label: "Link da página", name: "privacyLink" },
      ], "Exiba um aviso sobre uso de dados e vincule sua política de privacidade."),
      feature("unique-document", "Bloquear CPF/CNPJ duplicado", "👥", false, "Segurança", "Cadastro", "loja-inicial", [
        { kind: "toggle", label: "Não permitir cadastro com o mesmo CPF/CNPJ", name: "uniqueDocument", defaultChecked: true },
      ]),
      feature("minimum-sale", "Definir valor mínimo para venda", "↧", false, "Pedido", "Regra", "loja-mais", [
        { kind: "select", label: "Limitar vendas", name: "minimumSale", options: ["Desabilitado", "Somente por valor do pedido", "Somente por quantidade de produtos"] },
      ], "Defina limite mínimo de valor e/ou quantidade de produtos para venda."),
      feature("cancel-deadline", "Prazo para cancelamento do pedido", "⏱️", false, "Pedido", "Automação", "loja-mais", [
        { kind: "toggle", label: "Ativo", name: "cancelDeadlineActive", defaultChecked: true },
        { kind: "input", label: "Prazo para o cancelamento do pedido", name: "cancelDeadline", defaultValue: "10", unit: "Dia(s)" },
      ], "Defina o prazo para cancelamento automático quando não houver pagamento."),
      feature("completed-message", "Mensagem no pedido concluído", "▤", false, "Pedido", "Experiência", "loja-mais", [
        { kind: "toggle", label: "Exibir mensagem personalizada na conclusão do pedido", name: "completedMessageActive", defaultChecked: true },
        { kind: "input", label: "Mensagem", name: "completedMessage" },
      ], "Digite a mensagem que gostaria de exibir ao cliente quando o pedido for efetuado."),
      feature("approved-customers", "Compra somente para cadastros aprovados", "✓", false, "Segurança", "Cadastro", "loja-mais", [
        { kind: "toggle", label: "Permitir compra somente de cadastros aprovados", name: "approvedCustomers", defaultChecked: true },
      ]),
      feature("stock-deduction", "Quando retirar do estoque", "📋", false, "Pedido", "Estoque", "loja-completa", [
        { kind: "radio", label: "Quando retirar o produto do estoque", name: "stockDeduction", options: ["Quando o pagamento do pedido for aprovado", "Quando o cliente efetuar o pedido", "Quando o cliente adicionar o produto ao carrinho"] },
      ]),
      feature("order-files", "Habilitar envio de arquivos no pedido", "📄", false, "Pedido", "Upload", "loja-completa", [
        { kind: "toggle", label: "Envio de arquivos no pedido", name: "orderFiles", defaultChecked: true },
      ]),
      feature("sender-name", "Personalizar nome do remetente", "▤", false, "Pedido", "Envio", "loja-completa", [
        { kind: "toggle", label: "Exibir remetente personalizado", name: "senderActive", defaultChecked: true },
        { kind: "input", label: "Nome do remetente", name: "senderName" },
      ], "Digite o nome desejado para exibição do remetente na declaração de conteúdo."),
      feature("print-product-photo", "Exibir foto na impressão do pedido", "🖼️", false, "Pedido", "Impressão", "loja-completa", [
        { kind: "toggle", label: "Exibir a foto dos produtos na impressão do pedido", name: "printProductPhoto", defaultChecked: true },
      ]),
      feature("captcha", "Habilitar captcha nos formulários", "🔐", false, "Segurança", "Proteção", "loja-completa", [
        { kind: "toggle", label: "Habilitar captcha nos formulários", name: "captcha", defaultChecked: true },
      ]),
      feature("guest-checkout", "Compra sem cadastro", "👤", false, "Checkout", "Conversão", "loja-completa", [
        { kind: "toggle", label: "Permitir compra de usuários não cadastrados", name: "guestCheckout", defaultChecked: true },
      ], "Permite compras sem exigência de cadastro, solicitando as informações necessárias no checkout."),
      feature("cancel-request", "Permitir cancelamento de pedido", "🛒", false, "Pedido", "Pós-venda", "loja-completa", [
        { kind: "toggle", label: "Permitir solicitação de cancelamento do pedido", name: "cancelRequest", defaultChecked: true },
      ]),
    ],
  },
  {
    title: "Marketing, SEO e personalização",
    description: "Recursos para campanhas, scripts, SEO e experiências personalizadas.",
    features: [
      feature("related-description", "Descrição antes dos relacionados", "↕", true, "Marketing/SEO", "Conteúdo", "loja-gratis", [
        { kind: "toggle", label: "Descrição antes dos produtos relacionados", name: "relatedDescription", defaultChecked: true },
      ]),
      feature("seo", "SEO - Otimização da Loja para o Google", "🔎", false, "Marketing/SEO", "SEO", "loja-inicial", [
        { kind: "input", label: "Descrição da loja", name: "seoDescription" },
        { kind: "input", label: "Palavras-chave", name: "seoKeywords" },
        { kind: "textarea", label: "Google Webmaster Tools - Metatags de Verificação", name: "webmaster" },
        { kind: "code", label: "Google Analytics - Scripts", name: "analytics" },
      ], "Melhore o posicionamento de sua loja nas buscas do Google."),
      feature("popup", "Janela Pop-up ao entrar no site", "👁️", false, "Marketing/SEO", "Campanha", "loja-inicial", [
        { kind: "toggle", label: "Exibir janela pop-up ao entrar no site", name: "popup", defaultChecked: true },
        { kind: "input", label: "Link", name: "popupLink" },
        { kind: "toggle", label: "Definir manualmente altura e largura", name: "popupSize", defaultChecked: false },
      ], "Crie uma janela pop-up de promoções, informações e lançamentos."),
      feature("shipping-extra-time", "Prazo adicional personalizado", "🚚", false, "Marketing/SEO", "Transparência", "loja-inicial", [
        { kind: "toggle", label: "Exibir prazo adicional personalizado", name: "shippingExtraTime", defaultChecked: true },
        { kind: "input", label: "Prazo adicional", name: "extraTime" },
      ], "Informe ao cliente o prazo adicional para os produtos da sua loja."),
      feature("price-after-login", "Mostrar preço somente após login", "💲", false, "Marketing/SEO", "Restrição", "loja-mais", [
        { kind: "toggle", label: "Mostrar preço somente após o login", name: "priceAfterLogin", defaultChecked: true },
      ]),
      feature("robots", "Robots.txt", "🤖", true, "Marketing/SEO", "SEO técnico", "loja-completa", [
        { kind: "code", label: "Código - Robots.txt", name: "robots", defaultValue: "# robots.txt\nUser-agent: *\nAllow: /" },
      ], "Insira seu código do robots e controle o que deve ou não ser indexado pelos buscadores."),
      feature("newsletter", "Sistema de e-mails Newsletter", "📣", false, "Marketing/SEO", "CRM", "loja-completa", [
        { kind: "toggle", label: "Ativo", name: "newsletter", defaultChecked: true },
      ], "Lista de newsletter."),
      feature("javascript", "Adicionar JavaScript em todas as páginas", "SEO", false, "Marketing/SEO", "Scripts", "loja-completa", [
        { kind: "code", label: "Scripts no topo <head></head> da página", name: "headScript" },
        { kind: "code", label: "Scripts na base da página antes do </body>", name: "bodyScript" },
      ], "Insira seu código personalizado e crie suas próprias funções."),
      feature("home-page", "Página inicial ao entrar na loja", "📄", false, "Marketing/SEO", "Conteúdo", "loja-completa", [
        { kind: "toggle", label: "Ativo", name: "homePage", defaultChecked: true },
        { kind: "textarea", label: "Conteúdo", name: "homeContent" },
      ], "Crie uma página que será exibida antes de acessar a loja."),
      feature("wholesale-login", "Promoções após login", "🏷️", false, "Marketing/SEO", "Segmentação", "loja-ilimitada", [
        { kind: "toggle", label: "Exibir promoção de atacado e varejo após login", name: "wholesaleLogin", defaultChecked: true },
      ]),
    ],
  },
];

function feature(
  id: string,
  title: string,
  icon: string,
  active: boolean,
  category: AdvancedFeatureCategory,
  impactLabel: string,
  minimumPlanSlug: string,
  fields: AdvancedField[],
  info = "Selecione a opção que melhor se adequa ao seu plano de negócio.",
  warning?: string,
): AdvancedFeature {
  return {
    id,
    title,
    icon,
    description: title,
    active,
    info,
    fields,
    warning,
    category,
    impactLabel,
    minimumPlanSlug,
  };
}

export function getAdvancedFeature(featureId: string) {
  return advancedFeatureGroups.flatMap((group) => group.features).find((featureItem) => featureItem.id === featureId);
}

export function getAdvancedFeatures() {
  return advancedFeatureGroups.flatMap((group) => group.features);
}

