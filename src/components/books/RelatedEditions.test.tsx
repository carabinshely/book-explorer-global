import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RelatedEditions } from './RelatedEditions';

const work = {
  work_id: 'mock-work',
  family_title: {
    en: 'Mock Book',
    ru: 'Макет книги',
  },
  default_specs: {
    pages: 32,
    dimensions_mm: '210 x 210',
  },
};

const relatedSkus = [
  {
    sku_id: 'mock-book-en',
    slug: 'mock-book-en',
    work_id: 'mock-work',
    edition_type: 'mono' as const,
    languages: ['en'],
    title: 'Mock Book',
    description: 'Mono description',
    specs: { format: ['Paperback'], pages: 32, dimensions_mm: '210 x 210', isbn: '' },
    cover_image: '/cover-en.jpg',
    gallery_images: [],
    amazon: { asin: '', marketplaces: { US: 'https://example.com/en' } },
    media: {},
  },
  {
    sku_id: 'mock-book-en-ru',
    slug: 'mock-book-en-ru',
    work_id: 'mock-work',
    edition_type: 'bilingual' as const,
    languages: ['en', 'ru'],
    title: 'Mock Book EN/RU',
    description: 'Bilingual description',
    specs: { format: ['Paperback'], pages: 32, dimensions_mm: '210 x 210', isbn: '' },
    cover_image: '/cover-en-ru.jpg',
    gallery_images: [],
    amazon: { asin: '', marketplaces: { US: 'https://example.com/en-ru' } },
    media: {},
  },
];

describe('RelatedEditions', () => {
  it('shows language codes for both mono and bilingual editions', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <RelatedEditions relatedSkus={relatedSkus} work={work} />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('(EN)')).toBeInTheDocument();
    expect(screen.getByText('(EN, RU)')).toBeInTheDocument();
  });
});
