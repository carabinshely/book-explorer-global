import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useConsent } from '@/contexts/ConsentContext';

export function ConsentBanner() {
  const {
    analyticsConsent,
    isPromptOpen,
    acceptAnalytics,
    rejectAnalytics,
  } = useConsent();

  if (!isPromptOpen) return null;

  return (
    <section
      aria-labelledby="analytics-consent-title"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-2xl backdrop-blur"
      role="dialog"
    >
      <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl space-y-1">
          <h2 id="analytics-consent-title" className="font-display text-lg font-semibold text-foreground">
            Optional analytics
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Broner Books uses GA4 only after permission to understand aggregate site use. Advertising features are disabled. Essential preferences, such as your selected site language, work without analytics.{' '}
            <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
              Read the Privacy Notice
            </Link>
          </p>
          {analyticsConsent !== 'unset' && (
            <p className="text-xs text-muted-foreground">
              Current choice: analytics {analyticsConsent}. Choose again to update it.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="min-h-11 min-w-36" onClick={rejectAnalytics} variant="outline">
            Reject analytics
          </Button>
          <Button className="min-h-11 min-w-36" onClick={acceptAnalytics} variant="outline">
            Accept analytics
          </Button>
        </div>
      </div>
    </section>
  );
}
