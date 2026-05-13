export const DEFAULT_GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-DD2217GBC7';

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
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
