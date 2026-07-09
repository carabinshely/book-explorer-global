import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { BookCard } from './BookCard';
import { SKU } from '@/hooks/useBooks';

const skuWithMissingCover: SKU = {
  sku_id: 'missing-cover-en',
  slug: 'missing-cover-en',
  work_id: 'missing-cover',
  edition_type: 'mono',
  languages: ['en'],
  title: 'Missing Cover Book',
  description: 'A book whose generated cover has not arrived yet.',
  specs: { format: ['Paperback'], pages: 32, dimensions_mm: '210 x 210', isbn: '' },
  cover_image: '/generated/books/images/missing-cover/cover.jpg',
  gallery_images: [],
  amazon: { asin: '', marketplaces: { US: '' } },
  media: {},
};

const renderBookCard = () =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <LanguageProvider>
        <BookCard sku={skuWithMissingCover} />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('BookCard missing cover regression', () => {
  it('replaces a failed generated cover image with the intentional fallback', () => {
    // Regression: ISSUE-001 — generated cover path existed but the image failed to load.
    // Found by /qa on 2026-07-09.
    // Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-07-09.md
    renderBookCard();

    const cover = screen.getByRole('img', { name: /cover of missing cover book/i });
    fireEvent.error(cover);

    expect(screen.queryByRole('img', { name: /cover of missing cover book/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Missing Cover Book')).toHaveLength(2);
    expect(screen.getAllByText('EN')).toHaveLength(2);
  });
});
