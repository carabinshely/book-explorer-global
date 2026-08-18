import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disableGoogleAnalytics,
  enableGoogleAnalytics,
  initializeGoogleConsent,
  trackEvent,
  trackPageView,
} from './analytics';

describe('Google Analytics utilities', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    window.gtag = vi.fn();
    disableGoogleAnalytics('G-TEST123');
    vi.mocked(window.gtag).mockClear();
  });

  it('sets Consent Mode v2 defaults locally without loading Google', () => {
    initializeGoogleConsent();

    expect(window.gtag).toHaveBeenCalledWith('consent', 'default', {
      ad_personalization: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      analytics_storage: 'denied',
    });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('loads the Google tag only when analytics is enabled', () => {
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    enableGoogleAnalytics('G-TEST123');

    expect(document.querySelector('script[src*="googletagmanager"]')).toHaveAttribute(
      'src',
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123'
    );
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
      ad_personalization: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      analytics_storage: 'granted',
    });
    expect(window.gtag).toHaveBeenCalledWith('config', 'G-TEST123', expect.objectContaining({
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
    }));
  });

  it('does not load a tag for an empty measurement id', () => {
    enableGoogleAnalytics('   ');

    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('does not add duplicate tag scripts when enabled repeatedly', () => {
    enableGoogleAnalytics('G-TEST123');
    enableGoogleAnalytics('G-TEST123');

    expect(document.querySelectorAll('script#bronerbooks-google-tag')).toHaveLength(1);
  });

  it('removes the Google tag and sets the disable flag when rejected', () => {
    enableGoogleAnalytics('G-TEST123');
    disableGoogleAnalytics('G-TEST123');

    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    expect(window['ga-disable-G-TEST123']).toBe(true);
    expect(window.gtag).toHaveBeenLastCalledWith('consent', 'update', {
      ad_personalization: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      analytics_storage: 'denied',
    });
  });

  it('attempts to clear GA cookies across host and Broner Books domain scopes', () => {
    document.cookie = '_ga=test-value; Path=/';
    const cookieSetter = vi.spyOn(document, 'cookie', 'set');

    disableGoogleAnalytics('G-TEST123');

    const writes = cookieSetter.mock.calls.map(([value]) => value);
    expect(writes).toContain('_ga=; Max-Age=0; Path=/; SameSite=Lax');
    expect(writes).toContain('_ga=; Max-Age=0; Path=/; Domain=bronerbooks.com; SameSite=Lax');
    expect(writes).toContain('_ga=; Max-Age=0; Path=/; Domain=.bronerbooks.com; SameSite=Lax');
  });

  it('does not track page views without a measurement id', () => {
    trackPageView('', '/books/mock-book-en', 'Mock Book');

    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('tracks SPA page views with config updates', () => {
    enableGoogleAnalytics('G-TEST123');
    vi.mocked(window.gtag).mockClear();
    trackPageView('G-TEST123', '/books/mock-book-en', 'Mock Book');

    expect(window.gtag).toHaveBeenCalledWith('config', 'G-TEST123', {
      page_location: 'http://localhost:3000/books/mock-book-en',
      page_path: '/books/mock-book-en',
      page_title: 'Mock Book',
    });
  });

  it('tracks named events with parameters', () => {
    enableGoogleAnalytics('G-TEST123');
    vi.mocked(window.gtag).mockClear();
    trackEvent('amazon_click', { book_slug: 'mock-book-en' });

    expect(window.gtag).toHaveBeenCalledWith('event', 'amazon_click', {
      book_slug: 'mock-book-en',
    });
  });

  it('does not queue events after analytics is revoked', () => {
    enableGoogleAnalytics('G-TEST123');
    disableGoogleAnalytics('G-TEST123');
    vi.mocked(window.gtag).mockClear();

    trackEvent('amazon_click', { book_slug: 'mock-book-en' });
    trackPageView('G-TEST123', '/books/mock-book-en', 'Mock Book');

    expect(window.gtag).not.toHaveBeenCalled();
  });
});
