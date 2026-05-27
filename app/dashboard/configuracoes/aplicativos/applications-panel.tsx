"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  saveAppIntegrationAction,
  syncAppIntegrationAction,
  testAppIntegrationAction,
} from "./actions";

type PlanRequirement = "free" | "inicial" | "mais";
type FieldKind = "toggle" | "input" | "textarea" | "select" | "password";
type AppValues = Record<string, string | string[]>;

type AppField = {
  kind: FieldKind;
  name: string;
  label: string;
  help: string;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
};

type AppCard = {
  id: string;
  title: string;
  logo: string;
  description: string;
  plan: PlanRequirement;
  status: "active" | "inactive";
  modalTitle?: string;
  info: string;
  externalUrl?: string;
  fields: AppField[];
  values?: AppValues;
};

type AppGroup = {
  title: string;
  description: string;
  apps: AppCard[];
};

type StoredAppSetting = {
  featureId: string;
  active: boolean;
  values: AppValues;
};

const planRank = {
  "loja-gratis": 0,
  "loja-inicial": 1,
  "loja-mais": 2,
  "loja-completa": 3,
  "loja-ilimitada": 4,
};

const requirementRank = {
  free: 0,
  inicial: 1,
  mais: 2,
};

const appGroups: AppGroup[] = [
  {
    title: "Aumente suas vendas",
    description: "Gerencie os aplicativos que já estão disponíveis para uso em sua loja.",
    apps: [
      app("estoque-acabando", "Está acabando", "ESTÁ ACABANDO", "Transforme a escassez em oportunidade! Mostre o estoque crítico dos produtos aos seus clientes, aumentando o desejo e impulsionando suas intenções de compra.", "free", [
        toggle("Ativar estoque acabando", "Exibe alertas de poucas unidades disponíveis para gerar urgência na compra."),
      ], "Configure o gatilho de estoque acabando para estimular decisões rápidas de compra."),
      app("meta-brinde", "Meta para brinde", "META PARA BRINDE", "Motive seus clientes a comprar mais com Meta para Brinde! Estabeleça metas emocionantes e transforme suas vendas online em uma experiência recompensadora.", "free", [
        input("Valor da meta", "goalValue", "Valor mínimo para o comprador ganhar o brinde.", "Ex: 299,90"),
        input("Nome do brinde", "giftName", "Nome do brinde exibido para o comprador."),
      ], "Configure metas de compra para liberar brindes na loja."),
      app("pontos-cashback", "Créditos e Cashback", "CRÉDITOS E CASHBACK", "Incentive as compras na sua loja e fortaleça o vínculo com o seu cliente oferecendo créditos por cada compra efetuada.", "mais", [
        toggle("Ativar crédito e cashback", "Permite que compradores acumulem créditos para novas compras."),
        input("Percentual de cashback", "cashbackPercent", "Informe o percentual de retorno em crédito para o comprador.", "Ex: 5"),
        input("Validade dos créditos", "creditValidity", "Defina por quantos dias o crédito ficará disponível.", "Ex: 90 dias"),
      ], "Aquem em Crédito e CashBack é apenas para planos acima de Loja Mais."),
    ],
  },
  {
    title: "Aplicativos ativos de marketing",
    description: "Aplicativos para divulgação, campanhas, busca, newsletter e recuperação de clientes.",
    apps: [
      app("lista-casamento", "Lista de casamento", "LISTA CASAMENTO", "Crie listas especiais para eventos e presentes.", "free", [
        toggle("Ativar lista de casamento", "Exibe o recurso de listas para os compradores."),
      ]),
      app("wish-list", "Wish List", "WISH LIST", "Permite que compradores salvem produtos favoritos.", "free", [
        toggle("Ativar lista de desejos", "Exibe a lista de desejos na loja do cliente."),
      ]),
    ],
  },
  {
    title: "Aplicativos de marketing",
    description: "Conecte sua loja com ferramentas de anúncios, e-mail marketing e automação.",
    apps: [
      app("google-tag-manager", "Google Tag Manager", "Google", "Gerencie tags e eventos do site.", "free", [
        input("Container ID", "containerId", "Informe o ID do container do Google Tag Manager.", "GTM-XXXXXXX"),
      ]),
      app("google-shopping", "Google Shopping", "Google", "Envie produtos para campanhas no Google Shopping.", "free", [
        input("Merchant Center ID", "merchantId", "Informe o ID do Google Merchant Center."),
      ]),
      app("facebook-instagram", "Facebook Shop & Instagram Shopping", "Facebook", "Venda e divulgue produtos nas redes sociais.", "inicial", [
        input("Pixel ID", "pixelId", "Código do Pixel usado para mensurar eventos de compra."),
        input("Catálogo Facebook", "catalogId", "Identificador do catálogo de produtos no Facebook."),
      ], "Facebook Shop & Instagram Shopping é do plano Loja Inicial para cima."),
      app("google-analytics", "Google Analytics", "Google Analytics", "Acompanhe visitas e eventos da loja.", "free", [
        input("ID de medição", "measurementId", "Código de medição do Google Analytics.", "G-XXXXXXXXXX"),
      ]),
      app("shop-back", "ShopBack", "ShopBack", "Recupere visitantes com campanhas automatizadas.", "free", [
        input("ID da conta", "accountId", "Informe o ID da conta ShopBack."),
      ]),
      app("yandex-metrica", "Yandex Métrica", "Yandex Métrica", "Ferramenta de análise e comportamento.", "free", [
        input("Counter ID", "counterId", "Informe o contador fornecido pelo Yandex Métrica."),
      ]),
      app("sumo", "Sumo", "SUMO", "Captura de leads e ferramentas promocionais.", "free", [
        input("Site ID", "siteId", "Informe o identificador do site dentro do Sumo."),
      ]),
      app("mailchimp", "MailChimp", "MailChimp", "Sincronize contatos para campanhas de e-mail.", "mais", [
        input("API Key", "apiKey", "Chave de API gerada no MailChimp."),
        input("Audience ID", "audienceId", "Lista/audiência que receberá os contatos da loja."),
      ], "MailChimp é apenas para plano Loja Mais para cima."),
      app("rd-station", "RD Station / Marketing", "RD Station", "Automação de marketing e nutrição de leads.", "mais", [
        input("Client ID", "clientId", "Identificador da aplicação RD Station."),
        password("Client Secret", "clientSecret", "Chave secreta fornecida pelo RD Station."),
      ], "RD Station / Marketing é só para plano Loja Mais para cima."),
      app("trusted", "Trusted Company", "Trusted", "Colete avaliações e prova social.", "free", [
        input("Código da loja", "storeCode", "Código da loja na plataforma de avaliação."),
      ]),
    ],
  },
  {
    title: "Aplicativos de atendimento online",
    description: "Ferramentas para chat, WhatsApp, avaliações e relacionamento com o comprador.",
    apps: [
      app("jivochat", "JivoChat", "jivochat", "Chat online para atendimento no site.", "free", [
        input("Widget ID", "widgetId", "Código do widget JivoChat para exibição no site."),
      ]),
      app("whatsapp", "WhatsApp", "WhatsApp", "Botão de atendimento via WhatsApp.", "free", [
        input("Número do WhatsApp", "phone", "Informe o número com DDD usado para atendimento.", "(11) 99999-9999"),
        input("Mensagem inicial", "message", "Mensagem padrão aberta ao iniciar a conversa."),
      ]),
      app("disqus", "Disqus", "DISQUS", "Comentários e discussões em páginas da loja.", "free", [
        input("Shortname", "shortname", "Identificador da sua conta Disqus."),
      ]),
      app("facebook-comments", "Facebook Comments", "Facebook", "Comentários do Facebook nas páginas.", "free", [
        input("App ID", "appId", "Identificador do aplicativo do Facebook."),
      ]),
      app("yourviews", "Yourviews", "Yourviews", "Avaliações de produtos e reputação.", "free", [
        input("Token", "token", "Token de integração do Yourviews."),
      ]),
      app("trustvox", "Trustvox", "Trustvox", "Avaliações verificadas da loja.", "free", [
        input("Store ID", "storeId", "Identificador da loja dentro da Trustvox."),
      ]),
      app("zendesk", "Zendesk", "zendesk", "Atendimento e central de suporte.", "free", [
        input("Subdomínio Zendesk", "subdomain", "Subdomínio usado em sua conta Zendesk."),
      ]),
    ],
  },
  {
    title: "Aplicativos de logística e gestão",
    description: "Integrações de ERP, frete, emissão fiscal e transporte.",
    apps: [
      app("sigep-correios", "Sigep Correios", "Correios", "Integração com contrato dos Correios.", "mais", [
        input("Código administrativo", "adminCode", "Código administrativo do contrato dos Correios."),
        password("Senha", "password", "Senha de acesso do contrato."),
      ], "Sigep Correios é só do plano Loja Mais para cima."),
      app("melhor-envio", "Melhor Envio", "melhor envio", "Cotações e etiquetas de frete.", "mais", [
        input("Token", "token", "Token de integração do Melhor Envio."),
      ], "Melhor Envio é só do plano Loja Mais para cima."),
      app("nfe", "NF-e", "NF-e", "Emissão e gestão de notas fiscais.", "mais", [
        input("CNPJ emissor", "cnpj", "CNPJ usado para emissão fiscal."),
        textarea("Observações fiscais", "notes", "Informações adicionais para emissão de NF-e."),
      ], "NF-e é só do plano Loja Mais para cima."),
      app("enviou", "Enviou", "enviou", "Automação de comunicação e recuperação.", "free", [
        input("Token Enviou", "token", "Token fornecido no painel da Enviou."),
      ], "Ao clicar em acessar Enviou, você será enviado para o painel da Enviou.", "https://painel3.enviou.com.br/acesso"),
      app("bling", "Bling", "bling", "ERP para produtos, pedidos e notas.", "mais", [
        input("Client ID", "clientId", "Identificador da aplicação no Bling."),
        password("Client Secret", "clientSecret", "Chave secreta da aplicação no Bling."),
      ], "Bling é só do plano Loja Mais para cima."),
      app("kangu", "Kangu", "kangu", "Cotação e logística de envios.", "mais", [
        input("Token Kangu", "token", "Token da sua conta Kangu."),
      ], "Kangu é só do plano Loja Mais para cima."),
    ],
  },
  {
    title: "Aplicativos de marketplace",
    description: "Canais de venda e arquivos XML para divulgação em marketplaces.",
    apps: [
      app("facebook-xml", "Facebook XML", "Facebook XML", "Feed XML de produtos para Facebook.", "free", [
        input("Nome do feed", "feedName", "Nome interno para identificar o feed."),
      ]),
      app("mercado-livre", "Mercado Livre", "Mercado Livre", "Integração com anúncios do Mercado Livre.", "free", [
        input("User ID", "userId", "Identificador da conta Mercado Livre."),
      ]),
    ],
  },
  {
    title: "Aplicativos de segurança",
    description: "Ferramentas antifraude e validação de transações.",
    apps: [
      app("clearsale-start", "ClearSale Start", "clearsale", "Análise antifraude para pedidos.", "free", [
        input("Código da loja", "storeCode", "Código da loja cadastrado na ClearSale."),
      ]),
      app("clearsale-total", "ClearSale Total", "clearsale total", "Análise antifraude avançada.", "mais", [
        input("App Key", "appKey", "Chave de integração ClearSale Total."),
        password("App Secret", "appSecret", "Senha secreta ClearSale Total."),
      ], "ClearSale Total só do plano Loja Mais para cima."),
      app("konduto", "Konduto", "konduto", "Prevenção a fraude e comportamento de compra.", "free", [
        input("Public Key", "publicKey", "Chave pública usada no site."),
        password("Private Key", "privateKey", "Chave privada usada na integração."),
      ]),
      app("clearsale-auth", "ClearSale Auth", "ClearSale", "Autenticação e proteção de transações.", "free", [
        input("Token", "token", "Token de autenticação fornecido pela ClearSale."),
      ]),
    ],
  },
];

export function ApplicationsPanel({
  planSlug,
  initialSettings,
}: {
  planSlug: string;
  initialSettings: StoredAppSetting[];
}) {
  const [groups, setGroups] = useState(() => applyStoredSettings(appGroups, initialSettings));
  const [selectedApp, setSelectedApp] = useState<AppCard | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleGroups = buildVisibleGroups(groups);

  function saveApp(formData: FormData) {
    if (!selectedApp) return;
    const appCard = selectedApp;

    startTransition(async () => {
      const result = await saveAppIntegrationAction(appCard.id, formData);
      const active = formData.get("__active") === "true";
      const values = collectValues(formData);

      if (result.type === "success") {
        setGroups((current) => updateAppState(current, appCard.id, active, values));
        setSelectedApp(null);
      }

      setFeedback({
        type: result.type,
        message:
          result.type === "success"
            ? `Aplicativo "${appCard.title}" salvo com sucesso para esta loja.`
            : result.message,
      });
    });
  }

  function runIntegrationAction(appCard: AppCard, action: "test" | "sync") {
    startTransition(async () => {
      const result =
        action === "test"
          ? await testAppIntegrationAction(appCard.id)
          : await syncAppIntegrationAction(appCard.id);

      setFeedback({
        type: result.type,
        message: result.message,
      });
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-[#dddddd] px-5 py-4">
          <span className="text-xl">▦</span>
          <h1 className="font-bold text-slate-700">Aplicativos</h1>
        </header>
        <div className="border-l-4 border-cyan-500 bg-slate-50 px-5 py-4 text-sm text-slate-500">
          Conecte sua loja a ferramentas de marketing, logística, atendimento,
          marketplace e segurança. Cada configuração é salva individualmente
          para a loja atual.
        </div>
      </section>

      {visibleGroups.map((group) => (
        <section key={group.title} className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-[#d9d9d9] px-5 py-3">
            <span className="text-xl text-slate-700">{getGroupIcon(group.title)}</span>
            <h2 className="font-black text-slate-700">{getGroupTitle(group.title)}</h2>
          </header>
          <div className="m-3 flex items-center justify-between rounded border-l-4 border-cyan-400 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cyan-400 text-2xl font-black italic text-white">
                i
              </span>
              <p className="text-sm leading-6 text-slate-500">
                {getGroupDescription(group.title, group.description)}
              </p>
            </div>
            <span className="text-2xl font-black text-slate-600">×</span>
          </div>
          <div className="grid gap-5 p-5 pt-2 md:grid-cols-2 xl:grid-cols-3">
            {group.apps.map((appCard, index) => (
              <ApplicationCard
                key={appCard.id}
                appCard={appCard}
                locked={!canUseApp(planSlug, appCard.plan)}
                highlighted={group.title === "Aplicativos ativos" && index === 0}
                onOpen={() => setSelectedApp(appCard)}
              />
            ))}
          </div>
        </section>
      ))}

      {selectedApp ? (
        <ApplicationModal
          appCard={selectedApp}
          locked={!canUseApp(planSlug, selectedApp.plan)}
          planName={getPlanRequirementLabel(selectedApp.plan)}
          isPending={isPending}
          onClose={() => setSelectedApp(null)}
          onSave={saveApp}
          onTest={() => runIntegrationAction(selectedApp, "test")}
          onSync={() => runIntegrationAction(selectedApp, "sync")}
        />
      ) : null}

      {feedback ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
            <div
              className={`mx-auto grid size-14 place-items-center rounded-2xl text-2xl ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {feedback.type === "success" ? "✓" : "!"}
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-950">
              {feedback.type === "success" ? "Aplicativo salvo!" : "Não foi possível salvar"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="mt-7 w-full rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white"
            >
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApplicationCard({
  appCard,
  locked,
  highlighted,
  onOpen,
}: {
  appCard: AppCard;
  locked: boolean;
  highlighted: boolean;
  onOpen: () => void;
}) {
  const isActive = appCard.status === "active";

  return (
    <article
        className={`relative flex min-h-[190px] flex-col items-center overflow-hidden rounded border bg-white px-5 py-4 text-center shadow-sm transition ${
        highlighted || isActive
          ? "border-sky-500 ring-1 ring-sky-300"
          : "border-slate-300 hover:border-sky-300"
      } ${locked ? "bg-slate-50" : ""}`}
    >
      <span
        className={`absolute left-0 top-0 border-b-[48px] border-r-[48px] border-r-transparent ${
          isActive || highlighted ? "border-b-slate-300" : "border-b-slate-200"
        }`}
      />
      <span className="absolute left-2 top-1 text-sm font-black text-white">
        ✓
      </span>
      <div className="grid min-h-20 w-full place-items-center">
        <AppLogo appCard={appCard} />
      </div>
      <p className="mx-auto mt-3 flex-1 text-sm leading-6 text-slate-700">
        {appCard.description}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className={`mt-4 rounded border px-5 py-1.5 text-sm font-semibold transition ${
          locked
            ? "border-sky-300 bg-white text-sky-600"
            : isActive
              ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
              : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
        }`}
      >
        {locked ? "Disponível para plano superior" : isActive ? "Aplicativo ativo" : "Ativar recurso"}
      </button>
    </article>
  );
}

function AppLogo({ appCard }: { appCard: AppCard }) {
  if (appCard.id === "estoque-acabando") {
    return (
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-9 w-16 items-center rounded-sm border-4 border-slate-900 bg-white">
          <span className="ml-1 h-6 w-3 rounded-sm bg-purple-600" />
          <span className="absolute -right-2 top-2 h-4 w-2 rounded-r-sm border-4 border-l-0 border-slate-900 bg-white" />
        </span>
        <span className="text-left text-2xl font-black leading-5 tracking-wide text-slate-950">
          ESTÁ
          <br />
          ACABANDO
          <small className="block text-[8px] tracking-[0.35em] text-slate-500">
            ÚLTIMAS UNIDADES
          </small>
        </span>
      </div>
    );
  }

  if (appCard.id === "meta-brinde") {
    return (
      <div className="flex items-center gap-3 text-purple-700">
        <span className="text-4xl">🎁</span>
        <span className="text-left text-xl font-black leading-5">
          META PARA
          <br />
          <span className="border-b-4 border-purple-500 px-2 text-xs tracking-[0.35em]">
            BRINDE
          </span>
        </span>
      </div>
    );
  }

  if (appCard.id === "pontos-cashback") {
    return (
      <div className="flex items-center gap-3 text-purple-700">
        <span className="text-5xl">↩</span>
        <span className="text-left text-xl font-black leading-5 text-slate-950">
          CRÉDITOS E
          <br />
          CASHBACK
        </span>
      </div>
    );
  }

  const logo = getLogoStyle(appCard.id, appCard.logo);

  return (
    <div
      className={`flex min-h-14 min-w-40 items-center justify-center gap-2 rounded-xl px-4 py-2 ${logo.bg}`}
    >
      <span className={`grid size-10 place-items-center rounded-lg text-2xl font-black ${logo.iconBg} ${logo.color}`}>
        {logo.icon}
      </span>
      <span className={`text-xl font-black leading-5 ${logo.textColor ?? "text-slate-800"}`}>
        {logo.label}
      </span>
    </div>
  );
}

function getLogoStyle(id: string, fallback: string) {
  const logos: Record<
    string,
    {
      icon: string;
      label: string;
      color: string;
      iconBg: string;
      bg: string;
      textColor?: string;
    }
  > = {
    google: logo("G", "Google", "text-blue-600", "bg-white", "bg-white"),
    "google-tag-manager": logo("◆", "Tag Manager", "text-blue-500", "bg-blue-50", "bg-white"),
    "google-shopping": logo("A", "Google Ads", "text-emerald-600", "bg-emerald-50", "bg-white"),
    "google-analytics": logo("▥", "Analytics 4", "text-orange-500", "bg-orange-50", "bg-white"),
    "google-shopping-xml": logo("G", "Shopping XML", "text-blue-600", "bg-blue-50", "bg-white"),
    "facebook-instagram": logo("f", "facebook Pixel", "text-white", "bg-blue-700", "bg-white", "text-blue-800"),
    "facebook-comments": logo("💬", "Facebook", "text-blue-600", "bg-blue-50", "bg-white"),
    whatsapp: logo("☎", "WhatsApp", "text-white", "bg-emerald-500", "bg-white", "text-emerald-700"),
    disqus: logo("D", "DISQUS", "text-white", "bg-sky-500", "bg-white", "text-sky-600"),
    zendesk: logo("Z", "zendesk", "text-emerald-900", "bg-emerald-50", "bg-white"),
    mailchimp: logo("🐵", "MailChimp", "text-amber-800", "bg-amber-50", "bg-white"),
    "rd-station": logo("RD", "Station", "text-blue-700", "bg-blue-50", "bg-white"),
    sumo: logo("♛", "SUMO", "text-blue-700", "bg-blue-50", "bg-white"),
    "yandex-metrica": logo("Y", "Metrica", "text-red-600", "bg-red-50", "bg-white"),
    "shop-back": logo("◆", "ShopBack", "text-sky-500", "bg-sky-50", "bg-white"),
    bling: logo("b", "bling!", "text-lime-600", "bg-lime-50", "bg-white"),
    "bling-online": logo("b", "bling!", "text-lime-600", "bg-lime-50", "bg-white"),
    "bling-erp": logo("b", "bling!", "text-lime-600", "bg-lime-50", "bg-white"),
    correios: logo("✉", "Correios", "text-blue-700", "bg-yellow-100", "bg-white"),
    "sigep-correios": logo("S", "SIGEP WEB", "text-white", "bg-blue-700", "bg-white", "text-blue-800"),
    "melhor-envio": logo("〽", "melhor envio", "text-blue-600", "bg-blue-50", "bg-white"),
    enviou: logo("☁", "enviou", "text-slate-700", "bg-slate-100", "bg-white"),
    kangu: logo("k", "angu", "text-orange-600", "bg-orange-50", "bg-white", "text-slate-950"),
    nfe: logo("NF", "e", "text-emerald-700", "bg-emerald-50", "bg-white"),
    buscape: logo("◒", "buscapé", "text-white", "bg-slate-950", "bg-white"),
    "mercado-livre": logo("🤝", "mercado livre", "text-blue-700", "bg-yellow-100", "bg-white"),
    skyhub: logo("☊", "SkyHub", "text-sky-500", "bg-sky-50", "bg-white"),
    ebit: logo("e", "bit", "text-red-600", "bg-red-50", "bg-white"),
    confi: logo("C", "Confi", "text-white", "bg-indigo-600", "bg-white", "text-indigo-700"),
    "marca-dagua": logo("🏅", "Marca d'água", "text-purple-600", "bg-purple-50", "bg-white"),
    "clearsale-total": logo("☄", "ClearSale Total", "text-orange-500", "bg-orange-50", "bg-white"),
    olark: logo("O", "olark", "text-orange-600", "bg-orange-50", "bg-white"),
    pushcrew: logo("▱", "pushcrew", "text-sky-500", "bg-sky-50", "bg-white"),
    tawkto: logo("🦜", "TAWK.TO", "text-emerald-600", "bg-emerald-50", "bg-white"),
    jivochat: logo("J", "jivochat", "text-emerald-600", "bg-emerald-50", "bg-white"),
    yourviews: logo("Y", "Yourviews", "text-purple-600", "bg-purple-50", "bg-white"),
    trustvox: logo("T", "Trustvox", "text-blue-600", "bg-blue-50", "bg-white"),
    trusted: logo("✓", "Trusted", "text-blue-600", "bg-blue-50", "bg-white"),
    "lista-casamento": logo("🎁", "Lista", "text-purple-600", "bg-purple-50", "bg-white"),
    "wish-list": logo("♥", "Wish List", "text-purple-700", "bg-purple-50", "bg-white"),
  };

  return logos[id] ?? logo("▦", fallback, "text-slate-700", "bg-slate-100", "bg-white");
}

function logo(
  icon: string,
  label: string,
  color: string,
  iconBg: string,
  bg: string,
  textColor?: string,
) {
  return { icon, label, color, iconBg, bg, textColor };
}

function ApplicationModal({
  appCard,
  locked,
  planName,
  isPending,
  onClose,
  onSave,
  onTest,
  onSync,
}: {
  appCard: AppCard;
  locked: boolean;
  planName: string;
  isPending: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  onTest: () => void;
  onSync: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/70 px-4 py-8">
      <form action={onSave} className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#dddddd] px-6 py-4">
          <h2 className="text-xl font-black text-slate-700">
            {appCard.modalTitle ?? appCard.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-4xl font-black leading-none text-slate-600"
          >
            ×
          </button>
        </header>

        <div className="p-6">
          <div className="flex gap-4 rounded-lg bg-slate-50 p-4 text-slate-500">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-500 text-2xl font-black text-white">
              i
            </span>
            <p className="text-lg leading-7">{appCard.info}</p>
          </div>

          {locked ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-black text-amber-900">Aplicativo bloqueado para seu plano atual</h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Este aplicativo está disponível a partir do plano {planName}.
                Aumente o plano para liberar a configuração e uso deste recurso.
              </p>
              <Link
                href="/admin/planos"
                className="mt-4 inline-flex rounded bg-sky-600 px-5 py-3 text-sm font-black text-white"
              >
                Aumentar meu plano
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4">
                <FieldLabel
                  label="Status do aplicativo nesta loja"
                  help="Ative ou desative esta integração apenas para a loja atual. Outras lojas não serão afetadas."
                />
                <Toggle name="__active" defaultChecked={appCard.status === "active"} />
              </div>
              {appCard.fields.map((field) => (
                <AppField key={field.name} field={field} values={appCard.values ?? {}} />
              ))}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5">
          {appCard.externalUrl ? (
            <Link
              href={appCard.externalUrl}
              target="_blank"
              className="rounded bg-cyan-600 px-8 py-3 text-lg font-black text-white"
            >
              Acessar
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-600 px-8 py-3 text-lg font-black text-white"
          >
            Cancelar
          </button>
          {!locked ? (
            <>
              <button
                type="button"
                disabled={isPending || appCard.status !== "active"}
                onClick={onTest}
                className="rounded bg-cyan-600 px-8 py-3 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Testar conexão
              </button>
              <button
                type="button"
                disabled={isPending || appCard.status !== "active"}
                onClick={onSync}
                className="rounded bg-blue-700 px-8 py-3 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Sincronizar agora
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded bg-green-600 px-8 py-3 text-lg font-black text-white"
              >
                {isPending ? "Salvando..." : "✓ Salvar"}
              </button>
            </>
          ) : null}
        </footer>
      </form>
    </div>
  );
}

function AppField({ field, values }: { field: AppField; values: AppValues }) {
  const value = getStringValue(values[field.name], field.defaultValue);

  if (field.kind === "toggle") {
    return (
      <div className="grid gap-2">
        <FieldLabel label={field.label} help={field.help} />
        <Toggle name={field.name} defaultChecked={value !== "false"} />
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <label className="grid gap-2">
        <FieldLabel label={field.label} help={field.help} />
        <textarea
          name={field.name}
          defaultValue={value}
          placeholder={field.placeholder}
          className="min-h-32 rounded border border-slate-200 px-4 py-3"
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="grid gap-2">
        <FieldLabel label={field.label} help={field.help} />
        <select
          name={field.name}
          defaultValue={value || field.options?.[0]}
          className="h-12 max-w-md rounded border border-cyan-300 bg-white px-4 text-slate-600"
        >
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="grid gap-2">
      <FieldLabel label={field.label} help={field.help} />
      <input
        type={field.kind === "password" ? "password" : "text"}
        name={field.name}
        defaultValue={value}
        placeholder={field.placeholder}
        className="h-12 max-w-xl rounded border border-slate-200 px-4 outline-none focus:border-cyan-600"
      />
    </label>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold text-slate-500">
      {label}
      <span className="group relative inline-grid size-5 cursor-help place-items-center rounded-full border border-cyan-200 bg-cyan-50 text-[11px] font-black text-cyan-700">
        ?
        <span className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-72 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold leading-5 text-white shadow-xl group-hover:block">
          {help}
        </span>
      </span>
    </span>
  );
}

function Toggle({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center gap-3 text-base text-slate-600">
      <input type="hidden" name={name} value={String(checked)} />
      <span>Sim</span>
      <button
        type="button"
        onClick={() => setChecked((current) => !current)}
        className={`relative h-6 w-14 rounded-full transition ${
          checked ? "bg-cyan-100" : "bg-red-100"
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full transition ${
            checked ? "left-2 bg-cyan-700" : "left-8 bg-red-600"
          }`}
        />
      </button>
      <span>Não</span>
    </div>
  );
}

function app(
  id: string,
  title: string,
  logo: string,
  description: string,
  plan: PlanRequirement,
  fields: AppField[],
  info = "Configure este aplicativo para conectá-lo à loja atual.",
  externalUrl?: string,
): AppCard {
  return {
    id,
    title,
    logo,
    description,
    plan,
    status: "inactive",
    info,
    externalUrl,
    fields,
  };
}

function toggle(label: string, help: string): AppField {
  return {
    kind: "toggle",
    name: "activeOption",
    label,
    help,
    defaultValue: "true",
  };
}

function input(
  label: string,
  name: string,
  help: string,
  placeholder?: string,
): AppField {
  return { kind: "input", label, name, help, placeholder };
}

function password(label: string, name: string, help: string): AppField {
  return { kind: "password", label, name, help };
}

function textarea(label: string, name: string, help: string): AppField {
  return { kind: "textarea", label, name, help };
}

function canUseApp(planSlug: string, requirement: PlanRequirement) {
  const currentRank = planRank[planSlug as keyof typeof planRank] ?? 0;
  return currentRank >= requirementRank[requirement];
}

function getPlanRequirementLabel(requirement: PlanRequirement) {
  if (requirement === "mais") return "Loja Mais";
  if (requirement === "inicial") return "Loja Inicial";
  return "Loja Grátis";
}

function getGroupTitle(title: string) {
  if (title === "Aplicativos ativos") {
    return title;
  }

  const titles: Record<string, string> = {
    "Aumente suas vendas": "Aumente suas vendas",
    "Aplicativos ativos de marketing": "Aplicativos ativos",
    "Aplicativos de marketing": "Aplicativos de Marketing",
    "Aplicativos de atendimento online": "Aplicativos de Atendimento e Comunicação",
    "Aplicativos de logística e gestão": "Aplicativos de Gestão e Logística",
    "Aplicativos de marketplace": "Aplicativos de Marketplace",
    "Aplicativos de segurança": "Aplicativos de Segurança",
  };

  return titles[title] ?? title;
}

function getGroupIcon(title: string) {
  const icons: Record<string, string> = {
    "Aplicativos ativos": "📈",
    "Aumente suas vendas": "📈",
    "Aplicativos ativos de marketing": "⚡",
    "Aplicativos de marketing": "📣",
    "Aplicativos de atendimento online": "👥",
    "Aplicativos de logística e gestão": "📦",
    "Aplicativos de marketplace": "🏬",
    "Aplicativos de segurança": "🔒",
  };

  return icons[title] ?? "▦";
}

function getGroupDescription(title: string, fallback: string) {
  if (title === "Aplicativos ativos") {
    return "Estes são os aplicativos que estão ativados e aplicados nesta loja.";
  }

  const descriptions: Record<string, string> = {
    "Aumente suas vendas": "Dê um impulso às suas vendas com nossas ferramentas de gatilho especializadas.",
    "Aplicativos ativos de marketing": "Configure recursos ativos para melhorar a experiência de compra dentro da sua loja.",
    "Aplicativos de marketing": "Crie campanhas, capture leads, monitore seus clientes e crie estratégias de venda com estas ferramentas que irão lhe auxiliar a vender mais.",
    "Aplicativos de atendimento online": "Aproxime o seu cliente da sua loja virtual permitindo um contato mais direto, ágil e menos burocrático.",
    "Aplicativos de logística e gestão": "Controle, gerencie, organize e permita que o processo de gestão da sua loja virtual seja mais dinâmico e ágil.",
    "Aplicativos de marketplace": "Permita que seus produtos sejam anunciados pelas maiores empresas de venda online do mercado.",
    "Aplicativos de segurança": "Garanta mais confiabilidade à sua loja virtual com ferramentas que analisam riscos e detectam possíveis fraudes no processo de compra.",
  };

  return descriptions[title] ?? fallback;
}

function buildVisibleGroups(sourceGroups: AppGroup[]) {
  const activeApps = sourceGroups
    .flatMap((group) => group.apps)
    .filter((appCard) => appCard.status === "active");
  const remainingGroups = sourceGroups
    .map((group) => ({
      ...group,
      apps: group.apps.filter((appCard) => appCard.status !== "active"),
    }))
    .filter((group) => group.apps.length > 0);

  return [
    {
      title: "Aplicativos ativos",
      description: "Estes são os aplicativos que estão ativados e aplicados nesta loja.",
      apps: activeApps,
    },
    ...remainingGroups,
  ];
}

function applyStoredSettings(sourceGroups: AppGroup[], settings: StoredAppSetting[]) {
  const settingsByFeature = new Map(settings.map((setting) => [setting.featureId, setting]));

  return sourceGroups.map((group) => ({
    ...group,
    apps: group.apps.map((appCard) => {
      const setting = settingsByFeature.get(`app:${appCard.id}`);

      if (!setting) return appCard;

      return {
        ...appCard,
        status: setting.active ? ("active" as const) : ("inactive" as const),
        values: setting.values,
      };
    }),
  }));
}

function updateAppState(
  sourceGroups: AppGroup[],
  appId: string,
  active: boolean,
  values: AppValues,
) {
  return sourceGroups.map((group) => ({
    ...group,
    apps: group.apps.map((appCard) =>
      appCard.id === appId
        ? {
            ...appCard,
            status: active ? ("active" as const) : ("inactive" as const),
            values,
          }
        : appCard,
    ),
  }));
}

function collectValues(formData: FormData) {
  const values: AppValues = {};

  for (const [key, value] of formData.entries()) {
    if (key === "__active" || typeof value !== "string") continue;

    if (Object.prototype.hasOwnProperty.call(values, key)) {
      const current = values[key];
      values[key] = Array.isArray(current) ? [...current, value] : [current, value];
      continue;
    }

    values[key] = value;
  }

  return values;
}

function getStringValue(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}
