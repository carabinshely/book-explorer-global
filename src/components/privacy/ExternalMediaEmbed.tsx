import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';

type ExternalMediaEmbedProps = {
  provider: string;
  children: ReactNode;
  className?: string;
};

export function ExternalMediaEmbed({
  provider,
  children,
  className,
}: ExternalMediaEmbedProps) {
  const [allowed, setAllowed] = useState(false);

  if (allowed) return <>{children}</>;

  return (
    <div className={className ?? 'rounded-lg border border-border bg-muted/40 p-5'}>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        This optional {provider} player is blocked until requested. Loading it connects your browser to {provider}, which may process data under its own privacy terms.
      </p>
      <Button type="button" variant="outline" onClick={() => setAllowed(true)}>
        Load {provider}
      </Button>
    </div>
  );
}
