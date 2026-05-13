export const DEFAULT_GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-DD2217GBC7';

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_TAG_SCRIPT_ID = 'google-analytics-gtag';

function hasInitialConfig(measurementId: string) {
  return window.dataLayer?.some(
    (args) =>
      args[0] === 'config' &&
      args[1] === measurementId &&
      typeof args[2] === 'object' &&
      args[2] !== null &&
      'send_page_view' in args[2]
  );
}

export function initializeGoogleAnalytics(measurementId?: string) {
  const normalizedMeasurementId = measurementId?.trim();
  if (!normalizedMeasurementId || typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  if (!document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      normalizedMeasurementId
    )}`;
    document.head.appendChild(script);
  }

  if (!hasInitialConfig(normalizedMeasurementId)) {
    window.gtag('js', new Date());
    window.gtag('config', normalizedMeasurementId);
  }
}

export function trackPageView(
  measurementId: string | undefined,
  pagePath: string,
  pageTitle = document.title
) {
  const normalizedMeasurementId = measurementId?.trim();
  if (!normalizedMeasurementId || !window.gtag) return;

  window.gtag('config', normalizedMeasurementId, {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: pageTitle,
  });
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (!eventName || !window.gtag) return;

  window.gtag('event', eventName, params);
}
