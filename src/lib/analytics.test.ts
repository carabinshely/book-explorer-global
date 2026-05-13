import { beforeEach, describe, expect, it } from 'vitest';
import { initializeGoogleAnalytics, trackEvent, trackPageView } from './analytics';

describe('Google Analytics utilities', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.dataLayer;
    delete window.gtag;
  });

  it('does not load Google Analytics without a measurement id', () => {
    initializeGoogleAnalytics('');

    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
    expect(window.gtag).toBeUndefined();
  });

  it('loads Google Analytics once and sends the standard config hit', () => {
    initializeGoogleAnalytics('G-TEST123');
    initializeGoogleAnalytics('G-TEST123');

    const scripts = document.querySelectorAll('script[src="https://www.googletagmanager.com/gtag/js?id=G-TEST123"]');
    expect(scripts).toHaveLength(1);
    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 0: 'config', 1: 'G-TEST123' }),
      ])
    );
  });

  it('tracks SPA page views with config updates', () => {
    initializeGoogleAnalytics('G-TEST123');

    trackPageView('G-TEST123', '/books/mock-book-en', 'Mock Book');

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          0: 'config',
          1: 'G-TEST123',
          2: {
            page_location: 'http://localhost:3000/books/mock-book-en',
            page_path: '/books/mock-book-en',
            page_title: 'Mock Book',
          },
        }),
      ])
    );
  });

  it('tracks named events with parameters', () => {
    initializeGoogleAnalytics('G-TEST123');

    trackEvent('amazon_click', { book_slug: 'mock-book-en' });

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          0: 'event',
          1: 'amazon_click',
          2: { book_slug: 'mock-book-en' },
        }),
      ])
    );
  });
});
