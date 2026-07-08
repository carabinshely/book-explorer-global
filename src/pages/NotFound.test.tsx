import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import NotFound from './NotFound';

const renderNotFound = () =>
  render(
    <MemoryRouter initialEntries={['/missing-page']} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <LanguageProvider>
        <NotFound />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('NotFound page', () => {
  it('renders the branded site shell and recovery links', () => {
    // Regression: ISSUE-001 — unknown routes rendered an unbranded dead-end 404.
    // Found by /qa on 2026-07-07.
    // Report: .gstack/qa-reports/qa-report-bronerbooks-local-2026-07-07.md
    renderNotFound();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /this story wandered off the shelf/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse books/i })).toHaveAttribute('href', '/books');
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/');
  });

  it('does not write an expected miss to the error console', () => {
    // Regression: ISSUE-001 — normal 404 navigation polluted QA and user consoles.
    // Found by /qa on 2026-07-07.
    // Report: .gstack/qa-reports/qa-report-bronerbooks-local-2026-07-07.md
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderNotFound();

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
