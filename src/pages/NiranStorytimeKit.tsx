import { FormEvent, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import {
  NIRAN_CONSENT_VERSION,
  niranAttributionFields,
  readNiranAttribution,
  trackNiranEvent,
} from '@/lib/niranCampaign';

const MAILERLITE_FORM_URL = 'https://preview.mailerlite.io/forms/2565293/195350280476296614/share';

const NiranStorytimeKit = () => {
  const location = useLocation();
  const started = useRef(false);
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

  const recordFormStart = () => {
    if (started.current) return;
    started.current = true;
    trackNiranEvent('lead_form_started', analyticsProperties);
  };

  const handleProviderHandoff = (event: FormEvent<HTMLFormElement>) => {
    trackNiranEvent('lead_form_submitted', analyticsProperties);
    // The current MailerLite connector does not expose the provider's generated
    // static HTML POST contract. Until that exact contract is reconciled, use
    // the provider-owned double-opt-in form without loading its universal
    // tracking script into bronerbooks.com.
    event.currentTarget.submit();
  };

  return (
    <Layout>
      <section className="py-12 md:py-20 border-b border-border" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
            The Lost Umbrella of Niran
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-5">
            Get the free Magic Umbrella Storytime Kit
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A printable read, talk, and color companion for parents, caregivers, teachers, gift buyers, and other adults reading with children.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl space-y-10">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8 space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground">
                Send me the Storytime Kit
              </h2>
              <p className="text-muted-foreground">
                Enter your email and confirm it to receive the printable kit and accessible reading version.
              </p>
            </div>

            <form
              action={MAILERLITE_FORM_URL}
              method="get"
              target="_self"
              onFocus={recordFormStart}
              onSubmit={handleProviderHandoff}
              className="space-y-5"
            >
              {niranAttributionFields(attribution).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <input type="hidden" name="consent_version" value={NIRAN_CONSENT_VERSION} />

              <div className="space-y-2">
                <label htmlFor="niran-email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="niran-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="marketing_consent"
                  value="yes"
                  className="mt-1"
                />
                <span>
                  Yes — email me the three-message Niran Storytime series and occasional Broner Books news and book updates. I can unsubscribe at any time.
                </span>
              </label>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your email to receive the Storytime Kit. Providing it is voluntary, but we cannot email the Kit without it. Michael Broner, operating as Broner Books, uses MailerLite to process the request. See our{' '}
                <Link to="/privacy" className="underline underline-offset-2">
                  Privacy Notice
                </Link>.
              </p>

              <p className="text-sm text-muted-foreground leading-relaxed">
                For parents, caregivers, teachers, gift buyers, and other adults. Please do not submit a child&apos;s information.
              </p>

              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground"
              >
                Continue to secure email confirmation
              </button>
            </form>

            <p className="text-xs text-muted-foreground">
              The next step is hosted by MailerLite so the email address can be verified through double opt-in. Requesting the Kit does not by itself subscribe you to marketing.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground">
              A gentle conversation after the story
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              When something special goes missing, children often notice more than the missing object. Try asking: “Who could you ask for help?” and “What can make a treasured thing feel special even when it is not with you?”
            </p>
            <p className="text-muted-foreground">
              The complete Storytime Kit expands this into a short parent-guided read, talk, and color activity.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NiranStorytimeKit;
