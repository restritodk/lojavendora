import Script from "next/script";
import {
  getStoreAppValue,
  isStoreAppActive,
  type StoreAdvancedSettingMap,
} from "@/lib/store-advanced-settings";

export function StoreAppEffects({
  advancedSettings,
  currentUrl,
}: {
  advancedSettings?: StoreAdvancedSettingMap;
  currentUrl?: string;
}) {
  if (!advancedSettings) {
    return null;
  }

  const whatsappPhone = onlyDigits(getStoreAppValue(advancedSettings, "whatsapp", "phone"));
  const whatsappMessage = getStoreAppValue(
    advancedSettings,
    "whatsapp",
    "message",
    "Olá, quero tirar uma dúvida sobre a loja.",
  );

  return (
    <>
      {isStoreAppActive(advancedSettings, "whatsapp") && whatsappPhone ? (
        <a
          href={`https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-[80] flex items-center gap-3 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:bg-emerald-600"
        >
          <span className="grid size-8 place-items-center rounded-full bg-white/20 text-lg">
            ☎
          </span>
          WhatsApp
        </a>
      ) : null}

      <StoreTrackingScripts advancedSettings={advancedSettings} />
      <StoreWidgetScripts advancedSettings={advancedSettings} currentUrl={currentUrl} />
    </>
  );
}

export function GiftGoalBanner({
  advancedSettings,
}: {
  advancedSettings?: StoreAdvancedSettingMap;
}) {
  if (!advancedSettings || !isStoreAppActive(advancedSettings, "meta-brinde")) {
    return null;
  }

  const goalValue = getStoreAppValue(advancedSettings, "meta-brinde", "goalValue");
  const giftName = getStoreAppValue(advancedSettings, "meta-brinde", "giftName", "um brinde especial");

  return (
    <div className="border-b border-purple-100 bg-purple-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-5 py-3 text-center text-sm font-black text-purple-900 sm:px-8 lg:px-12">
        <span className="text-xl">🎁</span>
        <span>
          Meta para brinde ativa:
          {" "}
          {goalValue ? `compre acima de ${goalValue} e ganhe ${giftName}.` : `ganhe ${giftName} nas campanhas da loja.`}
        </span>
      </div>
    </div>
  );
}

export function StockScarcityBadge({
  stock,
  criticalStock,
  advancedSettings,
}: {
  stock: number;
  criticalStock: number;
  advancedSettings?: StoreAdvancedSettingMap;
}) {
  if (
    !advancedSettings ||
    !isStoreAppActive(advancedSettings, "estoque-acabando") ||
    stock <= 0 ||
    stock > criticalStock
  ) {
    return null;
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase text-amber-800">
      Está acabando: {stock} unidade(s)
    </span>
  );
}

function StoreTrackingScripts({
  advancedSettings,
}: {
  advancedSettings: StoreAdvancedSettingMap;
}) {
  const gaId = sanitizeByPattern(
    getStoreAppValue(advancedSettings, "google-analytics", "measurementId") ||
    getStoreAppValue(advancedSettings, "google", "analyticsId"),
    /^G-[A-Z0-9-]+$/i,
  );
  const gtmId = sanitizeByPattern(
    getStoreAppValue(advancedSettings, "google-tag-manager", "containerId"),
    /^GTM-[A-Z0-9-]+$/i,
  );
  const facebookPixelId = sanitizeByPattern(
    getStoreAppValue(advancedSettings, "facebook-instagram", "pixelId"),
    /^\d+$/,
  );
  const yandexCounterId = sanitizeByPattern(
    getStoreAppValue(advancedSettings, "yandex-metrica", "counterId"),
    /^\d+$/,
  );

  return (
    <>
      {isStoreAppActive(advancedSettings, "google-analytics") && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id={`vendora-ga-${gaId}`} strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      ) : null}

      {isStoreAppActive(advancedSettings, "google-tag-manager") && gtmId ? (
        <Script id={`vendora-gtm-${gtmId}`} strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      ) : null}

      {isStoreAppActive(advancedSettings, "facebook-instagram") && facebookPixelId ? (
        <Script id={`vendora-facebook-pixel-${facebookPixelId}`} strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${facebookPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}

      {isStoreAppActive(advancedSettings, "yandex-metrica") && yandexCounterId ? (
        <Script id={`vendora-yandex-${yandexCounterId}`} strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],
            k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(${yandexCounterId}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true });
          `}
        </Script>
      ) : null}
    </>
  );
}

function StoreWidgetScripts({
  advancedSettings,
  currentUrl,
}: {
  advancedSettings: StoreAdvancedSettingMap;
  currentUrl?: string;
}) {
  const jivoWidgetId = sanitizeIdentifier(getStoreAppValue(advancedSettings, "jivochat", "widgetId"));
  const zendeskSubdomain = sanitizeIdentifier(getStoreAppValue(advancedSettings, "zendesk", "subdomain"));
  const sumoSiteId = sanitizeIdentifier(getStoreAppValue(advancedSettings, "sumo", "siteId"));
  const shopBackAccountId = sanitizeIdentifier(getStoreAppValue(advancedSettings, "shop-back", "accountId"));
  const disqusShortname = sanitizeIdentifier(getStoreAppValue(advancedSettings, "disqus", "shortname"));
  const facebookAppId = sanitizeByPattern(
    getStoreAppValue(advancedSettings, "facebook-comments", "appId"),
    /^\d+$/,
  );
  const trustedStoreCode = sanitizeIdentifier(getStoreAppValue(advancedSettings, "trusted", "storeCode"));
  const trustvoxStoreId = sanitizeIdentifier(getStoreAppValue(advancedSettings, "trustvox", "storeId"));

  return (
    <>
      {isStoreAppActive(advancedSettings, "jivochat") && jivoWidgetId ? (
        <Script src={`https://code.jivosite.com/widget/${jivoWidgetId}`} strategy="afterInteractive" />
      ) : null}

      {isStoreAppActive(advancedSettings, "zendesk") && zendeskSubdomain ? (
        <Script
          id="ze-snippet"
          src={`https://static.zdassets.com/ekr/snippet.js?key=${zendeskSubdomain}`}
          strategy="afterInteractive"
        />
      ) : null}

      {isStoreAppActive(advancedSettings, "sumo") && sumoSiteId ? (
        <Script src={`https://load.sumo.com/?site_id=${sumoSiteId}`} strategy="afterInteractive" />
      ) : null}

      {isStoreAppActive(advancedSettings, "shop-back") && shopBackAccountId ? (
        <Script id={`vendora-shopback-${shopBackAccountId}`} strategy="afterInteractive">
          {`
            window._shopback = window._shopback || [];
            window._shopback.push(["account", "${shopBackAccountId}"]);
          `}
        </Script>
      ) : null}

      {isStoreAppActive(advancedSettings, "disqus") && disqusShortname ? (
        <Script id={`vendora-disqus-${disqusShortname}`} strategy="afterInteractive">
          {`
            window.disqus_shortname = "${disqusShortname}";
            window.disqus_config = function () { this.page.url = "${escapeScriptValue(currentUrl ?? "")}"; };
          `}
        </Script>
      ) : null}

      {isStoreAppActive(advancedSettings, "facebook-comments") && facebookAppId ? (
        <>
          <div id="fb-root" />
          <Script
            src={`https://connect.facebook.net/pt_BR/sdk.js#xfbml=1&version=v19.0&appId=${facebookAppId}`}
            strategy="afterInteractive"
          />
        </>
      ) : null}

      {isStoreAppActive(advancedSettings, "trusted") && trustedStoreCode ? (
        <Script id={`vendora-trusted-${trustedStoreCode}`} strategy="afterInteractive">
          {`window.vendoraTrustedCompany = { storeCode: "${trustedStoreCode}" };`}
        </Script>
      ) : null}

      {isStoreAppActive(advancedSettings, "trustvox") && trustvoxStoreId ? (
        <Script id={`vendora-trustvox-${trustvoxStoreId}`} strategy="afterInteractive">
          {`window._trustvox = window._trustvox || []; window._trustvox.push(["store", "${trustvoxStoreId}"]);`}
        </Script>
      ) : null}
    </>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "");
}

function sanitizeByPattern(value: string, pattern: RegExp) {
  return pattern.test(value) ? value : "";
}

function escapeScriptValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/</g, "\\u003c");
}
