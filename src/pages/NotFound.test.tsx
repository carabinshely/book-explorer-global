import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import NotFound from './NotFound';

const renderNotFound = (lang?: string) => {
  localStorage.clear();
  if (lang) localStorage.setItem('ui-lang', lang);

  return render(
    <MemoryRouter initialEntries={['/missing-page']} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <LanguageProvider>
        <NotFound />
      </LanguageProvider>
    </MemoryRouter>
  );
};

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

  it.each([
    ['es', 'Esta historia se salió del estante.', 'Ver libros', 'Volver al inicio'],
    ['eo', 'Ĉi tiu rakonto devojiĝis de la breto.', 'Rigardi librojn', 'Reveni hejmen'],
    ['ru', 'Эта история ушла с полки.', 'Смотреть книги', 'Вернуться домой'],
  ])('renders localized 404 copy and recovery actions for %s', (lang, title, booksLabel, homeLabel) => {
    renderNotFound(lang);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText('/missing-page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: booksLabel })).toHaveAttribute('href', '/books');
    expect(screen.getByRole('link', { name: homeLabel })).toHaveAttribute('href', '/');
  });

  it('renders Hebrew 404 copy in RTL while preserving recovery actions', () => {
    renderNotFound('he');

    expect(document.documentElement).toHaveAttribute('lang', 'he');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { name: 'הסיפור הזה נדד מהמדף.' })).toBeInTheDocument();
    expect(screen.getByText('/missing-page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'לעיון בספרים' })).toHaveAttribute('href', '/books');
    expect(screen.getByRole('link', { name: 'חזרה הביתה' })).toHaveAttribute('href', '/');
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
