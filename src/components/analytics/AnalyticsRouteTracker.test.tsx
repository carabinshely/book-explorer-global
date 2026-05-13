import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsRouteTracker } from './AnalyticsRouteTracker';

describe('AnalyticsRouteTracker', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.dataLayer;
    delete window.gtag;
  });

  it('initializes Google Analytics and sends the first route page view', () => {
    render(
      <MemoryRouter
        initialEntries={['/books/mock-book-en']}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <AnalyticsRouteTracker measurementId="G-TEST123" />
      </MemoryRouter>
    );

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          0: 'event',
          1: 'page_view',
          2: expect.objectContaining({
            page_path: '/books/mock-book-en',
            send_to: 'G-TEST123',
          }),
        }),
      ])
    );
  });
});
