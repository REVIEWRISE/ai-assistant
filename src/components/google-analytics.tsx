"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

interface GoogleAnalyticsProps {
  measurementId?: string;
}

/**
 * Google Analytics 4 (GA4) script loader.
 * Injects gtag.js asynchronously via Next.js Script component without blocking rendering.
 * Safely renders nothing if measurementId is absent or empty.
 */
export function GoogleAnalytics({
  measurementId = GA_MEASUREMENT_ID,
}: GoogleAnalyticsProps) {
  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}
