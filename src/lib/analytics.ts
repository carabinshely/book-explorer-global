export const DEFAULT_GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-DD2217GBC7';

const GOOGLE_TAG_SCRIPT_ID = 'bronerbooks-google-tag';

const DENIED_CONSENT_STATE = {
  ad_personalization: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  analytics_storage: 'denied',
} as const;

let analyticsAllowed = false;

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function ensureGoogleCommandQueue() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
}

export function initializeGoogleConsent() {
  if (typeof window === 'undefined') return;

  ensureGoogleCommandQueue();
  window.gtag?.('consent', 'default', DENIED_CONSENT_STATE);
}

export function enableGoogleAnalytics(
  measurementId = DEFAULT_GA_MEASUREMENT_ID
) {
  const normalizedMeasurementId = measurementId?.trim();
  if (!normalizedMeasurementId || typeof document === 'undefined') return;

  ensureGoogleCommandQueue();
  analyticsAllowed = true;
  window[`ga-disable-${normalizedMeasurementId}`] = false;
  window.gtag?.('consent', 'update', {
    ...DENIED_CONSENT_STATE,
    analytics_storage: 'granted',
  });

  if (!document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(normalizedMeasurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag?.('js', new Date());
  window.gtag?.('config', normalizedMeasurementId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    anonymize_ip: true,
  });
}

export function disableGoogleAnalytics(
  measurementId = DEFAULT_GA_MEASUREMENT_ID
) {
  const normalizedMeasurementId = measurementId?.trim();
  if (!normalizedMeasurementId || typeof document === 'undefined') return;

  ensureGoogleCommandQueue();
  analyticsAllowed = false;
  window.gtag?.('consent', 'update', DENIED_CONSENT_STATE);
  window[`ga-disable-${normalizedMeasurementId}`] = true;
  document.getElementById(GOOGLE_TAG_SCRIPT_ID)?.remove();

  const hostname = window.location.hostname.toLowerCase();
  const cookieDomains = new Set<string | undefined>([
    undefined,
    hostname,
    `.${hostname}`,
    'bronerbooks.com',
    '.bronerbooks.com',
  ]);

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name === '_ga' || name?.startsWith('_ga_')) {
      for (const domain of cookieDomains) {
        const domainAttribute = domain ? `; Domain=${domain}` : '';
        document.cookie = `${name}=; Max-Age=0; Path=/${domainAttribute}; SameSite=Lax`;
      }
    }
  }
}

export function trackPageView(
  measurementId: string | undefined,
  pagePath: string,
  pageTitle = document.title
) {
  const normalizedMeasurementId = measurementId?.trim();
  if (!analyticsAllowed || !normalizedMeasurementId || !window.gtag) return;

  window.gtag('config', normalizedMeasurementId, {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: pageTitle,
  });
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (!analyticsAllowed || !eventName || !window.gtag) return;

  window.gtag('event', eventName, params);
}
