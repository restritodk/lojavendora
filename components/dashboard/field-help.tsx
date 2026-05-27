export function FieldLabel({
  children,
  help,
}: {
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
      {children}
      {help ? (
        <span className="group/help relative inline-flex">
          <span className="grid size-4 cursor-help place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600">
            ?
          </span>
          <span className="pointer-events-none absolute bottom-full left-0 z-[999] mb-2 hidden w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold leading-5 text-white shadow-2xl group-hover/help:block">
            {help}
          </span>
        </span>
      ) : null}
    </span>
  );
}

const fieldHelp: Record<string, string> = {
  accessEmail:
    "E-mail usado pelo cliente para entrar na conta e acompanhar pedidos na loja.",
  additionalFreight:
    "Valor extra somado ao frete final, útil para embalagem, manuseio ou taxas.",
  ageGroup:
    "Ajuda a classificar o produto por faixa etária e melhorar filtros da loja.",
  allowOutOfStock:
    "Quando ativo, o cliente consegue comprar mesmo sem estoque disponível.",
  allowPromotions:
    "Indica se o cliente autorizou receber promoções, descontos e comunicados.",
  birthDate: "Data de nascimento do cliente, útil para cadastro e campanhas.",
  brand: "Marca ou fabricante do produto exibido na página e nos filtros.",
  categoryId:
    "Categoria onde o produto será exibido no menu e nas páginas da loja.",
  city: "Cidade do endereço do cliente.",
  complement:
    "Informação adicional do endereço, como bloco, apartamento ou referência.",
  costPrice:
    "Custo interno do produto. Ajuda no controle de margem e não aparece para o cliente.",
  criticalStock:
    "Quantidade mínima para considerar o estoque baixo e facilitar reposição.",
  customCode:
    "Código interno do produto, como SKU, referência ou código do fornecedor.",
  declaredValue:
    "Valor informado para cálculo ou declaração no envio da mercadoria.",
  description:
    "Texto completo com benefícios, características e informações importantes.",
  document: "CPF ou CNPJ usado para identificar o cliente no cadastro.",
  email: "E-mail principal para contato com o cliente.",
  freightType: "Define como o frete será calculado ou apresentado ao cliente.",
  gender: "Informação opcional para segmentar cadastros e campanhas.",
  genderTarget:
    "Indica o público do produto e ajuda em filtros ou recomendações.",
  googleShoppingCategory:
    "Categoria equivalente no Google Shopping para melhorar integração e anúncios.",
  height: "Altura da embalagem em centímetros para cálculo de frete.",
  imageUrl:
    "Link direto de uma imagem externa caso não queira enviar arquivo agora.",
  isLaunch:
    "Marca o produto como lançamento para exibição em áreas especiais da loja.",
  length: "Comprimento ou profundidade da embalagem em centímetros.",
  minQuantity:
    "Menor quantidade que o cliente poderá comprar em um único pedido.",
  model: "Modelo, versão ou variação comercial do produto.",
  name: "Nome exibido para o cliente na loja, listagens e página do produto.",
  neighborhood: "Bairro do endereço do cliente.",
  notes: "Anotações internas sobre o cliente. Não aparecem para o comprador.",
  number: "Número do endereço de entrega ou cadastro.",
  oldPrice:
    "Preço anterior exibido riscado para destacar desconto ou promoção.",
  origin: "Canal de origem do cliente, como site, WhatsApp ou campanha.",
  parentId: "Categoria principal onde a subcategoria será organizada.",
  password:
    "Senha usada pelo cliente para acessar a conta. Use uma senha segura.",
  phone: "Telefone principal para contato, avisos e atendimento.",
  price: "Preço de venda exibido ao cliente na loja.",
  priority:
    "Controla a importância do produto na organização das vitrines e listagens.",
  recommendedMode:
    "Define se a página do produto mostrará recomendações automáticas ou manuais.",
  secondaryEmail: "E-mail alternativo para contato com o cliente.",
  secondaryPhone: "Telefone alternativo para contato com o cliente.",
  shortDescription:
    "Resumo curto exibido em cards e áreas rápidas da vitrine.",
  showContent:
    "Permite exibir conteúdos adicionais vinculados a esta categoria.",
  showOnHome:
    "Quando ativo, o produto pode aparecer em áreas de destaque da página inicial.",
  showOnSite:
    "Quando ativo, o produto fica visível para compra no site do cliente.",
  showVideoOnListing:
    "Permite exibir vídeo do produto também nas listagens, quando disponível.",
  source: "Informa como o cliente conheceu a loja ou a marca.",
  state: "Estado/UF do endereço do cliente.",
  stateRegistration:
    "RG ou inscrição estadual, quando necessário para pessoa física ou jurídica.",
  status: "Situação atual do produto: disponível ou inativo.",
  stock: "Quantidade disponível para venda no estoque.",
  street: "Rua, avenida ou logradouro do endereço do cliente.",
  tags: "Palavras que ajudam na busca interna e organização do produto.",
  warranty: "Prazo ou condição de garantia informada ao cliente.",
  weight: "Peso da embalagem em quilos para cálculo de frete.",
  width: "Largura da embalagem em centímetros para cálculo de frete.",
  youtubeUrl: "Link de vídeo do YouTube para apresentar melhor o produto.",
  zipCode: "CEP usado para buscar e preencher o endereço automaticamente.",
};

export function getFieldHelp(name: string, label?: string) {
  if (fieldHelp[name]) {
    return fieldHelp[name];
  }

  if (!label) {
    return "Passe o mouse para entender como preencher este campo.";
  }

  const cleanLabel = label.replace("*", "").replace("?", "").trim();
  return `Use este campo para informar ${cleanLabel.toLowerCase()} no cadastro.`;
}
