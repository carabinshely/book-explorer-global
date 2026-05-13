import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsRouteTracker } from './AnalyticsRouteTracker';

function TestRoutes() {
  return (
    <>
      <AnalyticsRouteTracker measurementId="G-TEST123" />
      <Link to="/books/mock-book-en">Book detail</Link>
      <Routes>
        <Route path="/books" element={<h1>Books</h1>} />
        <Route path="/books/mock-book-en" element={<h1>Book detail</h1>} />
      </Routes>
    </>
  );
}

describe('AnalyticsRouteTracker', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
  });

  it('skips the static initial page view and tracks later route changes', () => {
    render(
      <MemoryRouter
        initialEntries={['/books']}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <TestRoutes />
      </MemoryRouter>
    );

    expect(window.gtag).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('link', { name: /book detail/i }));

    expect(window.gtag).toHaveBeenCalledWith(
      'config',
      'G-TEST123',
      expect.objectContaining({
        page_path: '/books/mock-book-en',
      })
    );
  });
});
