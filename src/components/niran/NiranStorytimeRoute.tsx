import NiranStorytimeKit from '@/pages/NiranStorytimeKit';
import NotFound from '@/pages/NotFound';
import { isNiranStorytimeEnabled } from '@/lib/niranFeature';

type NiranStorytimeRouteProps = Readonly<{
  enabled?: boolean;
}>;

export function NiranStorytimeRoute({
  enabled = isNiranStorytimeEnabled(),
}: NiranStorytimeRouteProps) {
  return enabled ? <NiranStorytimeKit /> : <NotFound />;
}
