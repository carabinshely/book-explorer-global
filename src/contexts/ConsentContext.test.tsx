import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentProvider } from './ConsentContext';
import { ConsentBanner } from '@/components/privacy/ConsentBanner';

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
});
