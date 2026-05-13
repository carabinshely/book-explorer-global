import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_GA_MEASUREMENT_ID,
  trackPageView,
} from '@/lib/analytics';

type AnalyticsRouteTrackerProps = {
  measurementId?: string;
};

export function AnalyticsRouteTracker({
  measurementId = DEFAULT_GA_MEASUREMENT_ID,
}: AnalyticsRouteTrackerProps) {
  const location = useLocation();
  const pagePath = `${location.pathname}${location.search}${location.hash}`;
  const hasSeenInitialRoute = useRef(false);

  useEffect(() => {
    if (!hasSeenInitialRoute.current) {
      hasSeenInitialRoute.current = true;
      return;
    }

    trackPageView(measurementId, pagePath);
  }, [measurementId, pagePath]);

  return null;
}
