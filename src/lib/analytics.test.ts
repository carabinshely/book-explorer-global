import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent, trackPageView } from './analytics';

describe('Google Analytics utilities', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
  });

  it('does not track page views without a measurement id', () => {
    trackPageView('', '/books/mock-book-en', 'Mock Book');

    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('tracks SPA page views with config updates', () => {
    trackPageView('G-TEST123', '/books/mock-book-en', 'Mock Book');

    expect(window.gtag).toHaveBeenCalledWith('config', 'G-TEST123', {
      page_location: 'http://localhost:3000/books/mock-book-en',
      page_path: '/books/mock-book-en',
      page_title: 'Mock Book',
    });
  });

  it('tracks named events with parameters', () => {
    trackEvent('amazon_click', { book_slug: 'mock-book-en' });

    expect(window.gtag).toHaveBeenCalledWith('event', 'amazon_click', {
      book_slug: 'mock-book-en',
    });
  });
});
