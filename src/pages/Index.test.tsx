import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Index from './Index';

const renderHome = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <Index />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Index page', () => {
  it('renders the featured books heading', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: /featured books/i })).toBeInTheDocument();
  });
});
