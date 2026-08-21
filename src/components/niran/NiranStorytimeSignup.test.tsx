import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NiranStorytimeSignup } from './NiranStorytimeSignup';
import { NIRAN_CONSENT_VERSION, trackNiranEvent } from '@/lib/niranCampaign';

vi.mock('@/lib/niranCampaign', async () => {
  const actual = await vi.importActual<typeof import('@/lib/niranCampaign')>(
    '@/lib/niranCampaign'
  );
  return { ...actual, trackNiranEvent: vi.fn() };
});

const EMAIL = 'person@example.test';
const SUCCESS_MESSAGE =
  'Thanks. If this address can receive the Storytime Kit, check the inbox for the next step.';

function renderSignup(
  entry = '/niran-storytime-kit?utm_source=instagram&utm_medium=organic_social&utm_campaign=niran_storytime_2026&utm_content=post_01&utm_term=parent_utility&email=leak%40example.test&arbitrary=nope'
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <NiranStorytimeSignup />
    </MemoryRouter>
  );
}

function acceptedFetch() {
  return vi.fn(async () =>
    new Response(JSON.stringify({ status: 'accepted' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function enterEmail() {
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: EMAIL },
  });
}

function submit() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Send me the Storytime Kit' })
  );
}

function submittedBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<
    string,
    unknown
  >;
}

describe('Niran Storytime first-party signup form', () => {
  beforeEach(() => {
    vi.mocked(trackNiranEvent).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the adult email-only collection surface with marketing unchecked', () => {
    renderSignup();

    expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email');
    expect(
      screen.getByLabelText(/Yes — email me the three-message Niran Storytime series/)
    ).not.toBeChecked();
    expect(screen.queryByLabelText(/child/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

  it('submits the exact consent version and Kit-only choice to the same-origin endpoint', async () => {
    const fetchMock = acceptedFetch();
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();
    enterEmail();
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/niran-storytime-signup',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(submittedBody(fetchMock)).toMatchObject({
      email: EMAIL,
      marketingConsent: false,
      consentVersion: NIRAN_CONSENT_VERSION,
    });
    expect(fetchMock.mock.calls[0][0]).not.toContain(EMAIL);
  });

  it('submits marketing consent only after the optional checkbox is selected', async () => {
    const fetchMock = acceptedFetch();
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();
    enterEmail();
    fireEvent.click(
      screen.getByLabelText(/Yes — email me the three-message Niran Storytime series/)
    );
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(submittedBody(fetchMock).marketingConsent).toBe(true);
  });

  it('includes only approved current-page UTM fields', async () => {
    const fetchMock = acceptedFetch();
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();
    enterEmail();
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(submittedBody(fetchMock)).toEqual({
      email: EMAIL,
      marketingConsent: false,
      consentVersion: NIRAN_CONSENT_VERSION,
      utm_source: 'instagram',
      utm_medium: 'organic_social',
      utm_campaign: 'niran_storytime_2026',
      utm_content: 'post_01',
      utm_term: 'parent_utility',
    });
    expect(JSON.stringify(submittedBody(fetchMock))).not.toContain('arbitrary');
    expect(JSON.stringify(submittedBody(fetchMock))).not.toContain(
      'leak@example.test'
    );
  });

  it('keeps the submit button disabled and blocks duplicate submissions in flight', async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();
    enterEmail();
    submit();

    const inFlightButton = await screen.findByRole('button', { name: 'Sending…' });
    expect(inFlightButton).toBeDisabled();
    fireEvent.click(inFlightButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest?.(new Response('', { status: 202 }));
    await screen.findByRole('status');
  });

  it('emits lead_form_started once on the first meaningful interaction', () => {
    vi.stubGlobal('fetch', acceptedFetch());
    renderSignup();
    enterEmail();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: `${EMAIL}x` },
    });
    fireEvent.click(
      screen.getByLabelText(/Yes — email me the three-message Niran Storytime series/)
    );

    expect(trackNiranEvent).toHaveBeenCalledTimes(1);
    expect(trackNiranEvent).toHaveBeenCalledWith(
      'lead_form_started',
      expect.objectContaining({
        page_path: '/niran-storytime-kit',
        utm_source: 'instagram',
      })
    );
  });

  it('does not emit lead_form_submitted until the server returns 202', async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve;
          })
      )
    );
    renderSignup();
    enterEmail();
    submit();

    await screen.findByRole('button', { name: 'Sending…' });
    expect(trackNiranEvent).not.toHaveBeenCalledWith(
      'lead_form_submitted',
      expect.anything()
    );

    resolveRequest?.(new Response('', { status: 202 }));
    await screen.findByRole('status');
    expect(trackNiranEvent).toHaveBeenCalledWith(
      'lead_form_submitted',
      expect.objectContaining({ page_path: '/niran-storytime-kit' })
    );
  });

  it('never emits lead_signup_confirmed from the website', async () => {
    vi.stubGlobal('fetch', acceptedFetch());
    renderSignup();
    enterEmail();
    submit();

    await screen.findByRole('status');
    expect(trackNiranEvent).not.toHaveBeenCalledWith(
      'lead_signup_confirmed',
      expect.anything()
    );
  });

  it('does not emit successful submission analytics after a failed POST', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 }))
    );
    renderSignup();
    enterEmail();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Storytime Kit request is unavailable right now. Please try again.'
    );
    expect(trackNiranEvent).not.toHaveBeenCalledWith(
      'lead_form_submitted',
      expect.anything()
    );
  });

  it('shows a generic non-enumerating message after acceptance', async () => {
    vi.stubGlobal('fetch', acceptedFetch());
    renderSignup();
    enterEmail();
    submit();

    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent(SUCCESS_MESSAGE);
    expect(result).not.toHaveTextContent(EMAIL);
    expect(result).not.toHaveTextContent(/active|unconfirmed|suppressed|double opt-in/i);
  });
});
