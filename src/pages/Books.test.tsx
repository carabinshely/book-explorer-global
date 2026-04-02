import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/generated/books/catalog.json', () => ({
  default: {
    schema_version: 'book-explorer-global-publish-v1',
    generated_at: '2026-04-02T00:00:00Z',
    works: [
      {
        work_id: 'mock-book',
        family_title: { en: 'Mock Book' },
        default_specs: { pages: 32, dimensions_mm: '210 x 210' },
      },
    ],
    skus: [
      {
        sku_id: 'mock-book-en',
        slug: 'mock-book-en',
        work_id: 'mock-book',
        edition_type: 'mono',
        languages: ['en'],
        title: 'Mock Book',
        description: 'Mock description',
        specs: { format: ['Paperback'], pages: 32, dimensions_mm: '210 x 210', isbn: '' },
        cover_image: '/generated/books/images/mock-book/cover.jpg',
        gallery_images: ['/generated/books/images/mock-book/back.jpg'],
        amazon: { marketplaces: { US: '' } },
        media: {},
      },
    ],
  },
}));

import Books from './Books';

const renderBooks = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <Books />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Books page', () => {
  it('renders cover images from the published catalog', () => {
    renderBooks();
    const cover = screen.getByRole('img', { name: /cover of mock book/i });
    expect(cover).toHaveAttribute('src', expect.stringContaining('/generated/books/images/'));
  });
});
