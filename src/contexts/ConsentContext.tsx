import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  disableGoogleAnalytics,
  enableGoogleAnalytics,
} from '@/lib/analytics';

export type AnalyticsConsent = 'accepted' | 'rejected' | 'unset';

type StoredConsent = {
  choice: Exclude<AnalyticsConsent, 'unset'>;
  recordedAt: string;
  version: 1;
};

type ConsentContextValue = {
  analyticsConsent: AnalyticsConsent;
  isPromptOpen: boolean;
  acceptAnalytics: () => void;
  rejectAnalytics: () => void;
  openPrivacySettings: () => void;
};

const CONSENT_STORAGE_KEY = 'bronerbooks-analytics-consent';
const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 183;

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

function readStoredConsent(): AnalyticsConsent {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return 'unset';

    const stored = JSON.parse(raw) as StoredConsent;
    const recordedAt = Date.parse(stored.recordedAt);
    if (
      stored.version !== 1 ||
      !['accepted', 'rejected'].includes(stored.choice) ||
      !Number.isFinite(recordedAt) ||
      recordedAt > Date.now() ||
      Date.now() - recordedAt > CONSENT_MAX_AGE_MS
    ) {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      return 'unset';
    }

    return stored.choice;
  } catch {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    return 'unset';
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(readStoredConsent);
  const [isPromptOpen, setIsPromptOpen] = useState(analyticsConsent === 'unset');

  useEffect(() => {
    if (analyticsConsent === 'accepted') {
      enableGoogleAnalytics();
    } else {
      disableGoogleAnalytics();
    }
  }, [analyticsConsent]);

  useEffect(() => {
    const synchronizeConsent = (event: StorageEvent) => {
      if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;

      const choice = readStoredConsent();
      setAnalyticsConsent(choice);
      setIsPromptOpen(choice === 'unset');
    };

    window.addEventListener('storage', synchronizeConsent);
    return () => window.removeEventListener('storage', synchronizeConsent);
  }, []);

  const saveChoice = useCallback((choice: Exclude<AnalyticsConsent, 'unset'>) => {
    const stored: StoredConsent = {
      choice,
      recordedAt: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    setAnalyticsConsent(choice);
    setIsPromptOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      analyticsConsent,
      isPromptOpen,
      acceptAnalytics: () => saveChoice('accepted'),
      rejectAnalytics: () => saveChoice('rejected'),
      openPrivacySettings: () => setIsPromptOpen(true),
    }),
    [analyticsConsent, isPromptOpen, saveChoice]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalConsent() {
  return useContext(ConsentContext);
}
