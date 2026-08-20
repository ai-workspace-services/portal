import Script from "next/script";

import VercelWebAnalytics from "@/components/analytics/VercelWebAnalytics";
import { resolveSiteAnalytics } from "@/lib/siteAnalytics";

/**
 * <head> 里的分析脚本。每一项都可以单独关，关掉就一个请求都不发。
 * 想接新的厂商就在这里加一段 + 在 lib/siteAnalytics.ts 加一个变量，
 * 不要再把 id 写死在 layout 里。
 */
export function SiteAnalyticsScripts({ siteHost }: { siteHost: string }) {
  const analytics = resolveSiteAnalytics();

  return (
    <>
      {analytics.googleId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${analytics.googleId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${analytics.googleId}');
          `}
          </Script>
        </>
      ) : null}

      {analytics.cloudflareToken ? (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: analytics.cloudflareToken })}
          strategy="afterInteractive"
        />
      ) : null}

      {analytics.datafastId ? (
        <Script
          src="https://datafa.st/js/script.js"
          data-website-id={analytics.datafastId}
          data-domain={siteHost}
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}

/** <body> 末尾的分析组件。 */
export function SiteAnalyticsBody() {
  const analytics = resolveSiteAnalytics();

  return analytics.vercel ? <VercelWebAnalytics /> : null;
}
