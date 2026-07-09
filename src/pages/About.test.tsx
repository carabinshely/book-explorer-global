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
  afterEach(() => {
    window.history.pushState({}, '', '/');
    window.localStorage.clear();
  });

  it('renders the editorial mission, story, and guiding-principles sections', () => {
    renderAbout();

    expect(screen.getByRole('heading', { name: /about us/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our story/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what guides each edition/i })).toBeInTheDocument();
    expect(screen.getByText(/carefully curated editions with beautiful design/i)).toBeInTheDocument();
  });

  it('localizes section labels for non-English UI languages', () => {
    window.history.pushState({}, '', '/about?lang=es');

    renderAbout();

    expect(screen.getByText('Misión')).toBeInTheDocument();
    expect(screen.getByText('Estudio')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lo que guía cada edición' })).toBeInTheDocument();
  });
});
