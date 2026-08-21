import { FormEvent, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  NIRAN_CONSENT_VERSION,
  readNiranAttribution,
  trackNiranEvent,
} from '@/lib/niranCampaign';

const SIGNUP_ENDPOINT = '/api/niran-storytime-signup';
const SUCCESS_MESSAGE =
  'Thanks. If this address can receive the Storytime Kit, check the inbox for the next step.';
const FAILURE_MESSAGE =
  'The Storytime Kit request is unavailable right now. Please try again.';

type SubmissionState = 'idle' | 'submitting' | 'accepted' | 'failed';

export function NiranStorytimeSignup() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');
  const started = useRef(false);
  const inFlight = useRef(false);

  const attribution = useMemo(
    () => readNiranAttribution(location.search),
    [location.search]
  );
  const analyticsProperties = useMemo(
    () => ({
      ...attribution,
      page_path: location.pathname,
      content_id: 'niran_storytime_kit_landing',
    }),
    [attribution, location.pathname]
  );

  const recordStarted = () => {
    if (started.current) return;
    started.current = true;
    trackNiranEvent('lead_form_started', analyticsProperties);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;

    inFlight.current = true;
    setSubmissionState('submitting');

    try {
      const response = await fetch(SIGNUP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          marketingConsent,
          consentVersion: NIRAN_CONSENT_VERSION,
          ...attribution,
        }),
      });

      if (response.status !== 202) {
        setSubmissionState('failed');
        return;
      }

      setSubmissionState('accepted');
      trackNiranEvent('lead_form_submitted', analyticsProperties);
    } catch {
      setSubmissionState('failed');
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 md:p-8 space-y-5">
      <div className="space-y-2">
        <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground">
          Get the free Magic Umbrella Storytime Kit
        </h2>
        <p className="text-muted-foreground">
          Enter your email and confirm it to receive the printable kit and accessible reading version.
        </p>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <label htmlFor="niran-signup-email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="niran-signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              recordStarted();
            }}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
          />
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Enter your email to receive the Storytime Kit. Providing it is voluntary, but we cannot email the Kit without it. Michael Broner, operating as Broner Books, uses MailerLite to process the request. See our{' '}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Notice
          </Link>.
        </p>

        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            name="marketingConsent"
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => {
              setMarketingConsent(event.target.checked);
              recordStarted();
            }}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span>
            Yes — email me the three-message Niran Storytime series and occasional Broner Books news and book updates. I can unsubscribe at any time.
          </span>
        </label>

        <p className="text-sm text-muted-foreground leading-relaxed">
          For parents, caregivers, teachers, gift buyers, and other adults. Please do not submit a child&apos;s information.
        </p>

        <button
          type="submit"
          disabled={submissionState === 'submitting'}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submissionState === 'submitting'
            ? 'Sending…'
            : 'Send me the Storytime Kit'}
        </button>
      </form>

      {submissionState === 'accepted' && (
        <p role="status" className="text-sm text-foreground">
          {SUCCESS_MESSAGE}
        </p>
      )}
      {submissionState === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          {FAILURE_MESSAGE}
        </p>
      )}
    </div>
  );
}
