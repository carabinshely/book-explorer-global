import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import About from './About';

const renderAbout = () =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <LanguageProvider>
        <About />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('About page', () => {
  it('renders the editorial mission, story, and guiding-principles sections', () => {
    renderAbout();

    expect(screen.getByRole('heading', { name: /about us/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our story/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what guides each edition/i })).toBeInTheDocument();
    expect(screen.getByText(/carefully curated editions with beautiful design/i)).toBeInTheDocument();
  });
});
