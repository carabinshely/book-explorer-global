import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentProvider } from './ConsentContext';
import { useConsent } from './ConsentContext';
import { ConsentBanner } from '@/components/privacy/ConsentBanner';

function ConsentState() {
  const { analyticsConsent } = useConsent();
  return <output data-testid="analytics-consent">{analyticsConsent}</output>;
}

describe('ConsentProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '';
  });

  it('does not contact Google before affirmative consent', () => {
    render(
      <MemoryRouter>
        <ConsentProvider><ConsentBanner /></ConsentProvider>
      </MemoryRouter>
    );

    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reject analytics' }));
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('loads analytics after acceptance and stores the choice', () => {
    render(
      <MemoryRouter>
        <ConsentProvider><ConsentBanner /></ConsentProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));

    expect(document.querySelector('script[src*="googletagmanager"]')).not.toBeNull();
    expect(localStorage.getItem('bronerbooks-analytics-consent')).toContain('accepted');
  });

  it('revokes analytics when a different tab rejects consent', () => {
    render(
      <MemoryRouter>
        <ConsentProvider>
          <ConsentBanner />
          <ConsentState />
        </ConsentProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
    const rejectedConsent = JSON.stringify({
      choice: 'rejected',
      recordedAt: new Date().toISOString(),
      version: 1,
    });
    localStorage.setItem('bronerbooks-analytics-consent', rejectedConsent);
    fireEvent(window, new StorageEvent('storage', {
      key: 'bronerbooks-analytics-consent',
      newValue: rejectedConsent,
      storageArea: localStorage,
    }));

    expect(screen.getByTestId('analytics-consent')).toHaveTextContent('rejected');
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('expires a stored choice after six months and asks again', () => {
    localStorage.setItem('bronerbooks-analytics-consent', JSON.stringify({
      choice: 'accepted',
      recordedAt: new Date(Date.now() - (184 * 24 * 60 * 60 * 1000)).toISOString(),
      version: 1,
    }));

    render(
      <MemoryRouter>
        <ConsentProvider><ConsentBanner /></ConsentProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Accept analytics' })).toBeInTheDocument();
    expect(localStorage.getItem('bronerbooks-analytics-consent')).toBeNull();
  });

  it('discards malformed stored consent and asks again', () => {
    localStorage.setItem('bronerbooks-analytics-consent', '{not-json');

    render(
      <MemoryRouter>
        <ConsentProvider><ConsentBanner /></ConsentProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Accept analytics' })).toBeInTheDocument();
    expect(localStorage.getItem('bronerbooks-analytics-consent')).toBeNull();
  });

  it('discards a future-dated stored choice instead of enabling analytics', () => {
    localStorage.setItem('bronerbooks-analytics-consent', JSON.stringify({
      choice: 'accepted',
      recordedAt: new Date(Date.now() + 60_000).toISOString(),
      version: 1,
    }));

    render(
      <MemoryRouter>
        <ConsentProvider><ConsentBanner /></ConsentProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Accept analytics' })).toBeInTheDocument();
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('hides the prompt after a visitor records a choice', () => {
    render(
      <MemoryRouter>
        <ConsentProvider><ConsentBanner /></ConsentProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
    expect(screen.queryByRole('button', { name: 'Reject analytics' })).toBeNull();
  });
});
