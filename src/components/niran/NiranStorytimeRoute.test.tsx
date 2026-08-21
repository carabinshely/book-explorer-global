import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { isNiranStorytimeEnabled } from '@/lib/niranFeature';
import { NiranStorytimeRoute } from './NiranStorytimeRoute';

function renderRoute(enabled: boolean) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/niran-storytime-kit']}>
        <NiranStorytimeRoute enabled={enabled} />
      </MemoryRouter>
    </LanguageProvider>
  );
}

describe('Niran Storytime production gate', () => {
  it('is fail-closed for missing, empty, or non-exact values', () => {
    expect(isNiranStorytimeEnabled(undefined)).toBe(false);
    expect(isNiranStorytimeEnabled('')).toBe(false);
    expect(isNiranStorytimeEnabled('TRUE')).toBe(false);
    expect(isNiranStorytimeEnabled('1')).toBe(false);
  });

  it('enables only the exact reviewed value', () => {
    expect(isNiranStorytimeEnabled('true')).toBe(true);
  });

  it('renders the normal not-found experience while disabled', () => {
    renderRoute(false);

    expect(screen.getByText('/niran-storytime-kit')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send me the Storytime Kit' })
    ).not.toBeInTheDocument();
  });

  it('renders the campaign form only while explicitly enabled', () => {
    renderRoute(true);

    expect(
      screen.getByRole('button', { name: 'Send me the Storytime Kit' })
    ).toBeInTheDocument();
  });
});
