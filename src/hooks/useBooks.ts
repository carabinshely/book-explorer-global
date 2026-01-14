import { useMemo } from 'react';

// Import all SKU data
import happyLighthouseEn from '@/data/skus/happy-lighthouse-en.json';
import happyLighthouseEs from '@/data/skus/happy-lighthouse-es.json';
import happyLighthouseBilingual from '@/data/skus/happy-lighthouse-bilingual.json';
import moonlitGardenEn from '@/data/skus/moonlit-garden-en.json';
import moonlitGardenFr from '@/data/skus/moonlit-garden-fr.json';
import stargazersJourneyEn from '@/data/skus/stargazers-journey-en.json';
import stargazersJourneyBilingual from '@/data/skus/stargazers-journey-bilingual.json';

// Import work data
import happyLighthouseWork from '@/data/works/happy-lighthouse.json';
import moonlitGardenWork from '@/data/works/moonlit-garden.json';
import stargazersJourneyWork from '@/data/works/stargazers-journey.json';

export interface SKU {
  sku_id: string;
  slug: string;
  work_id: string;
  edition_type: 'mono' | 'bilingual';
  languages: string[];
  title: string;
  description: string;
  specs: {
    format: string[];
    pages: number;
    dimensions_mm: string;
    isbn: string;
  };
  images: string[];
  amazon: {
    asin: string;
    marketplaces: Record<string, string>;
  };
  media: {
    spotify?: Record<string, string>;
    apple_music?: Record<string, string>;
    youtube?: Record<string, string>;
  };
}

export interface Work {
  work_id: string;
  order: number;
  family_title: Record<string, string>;
  default_specs: {
    pages: number;
    dimensions_mm: string;
  };
  canonical_images: string[];
}

const allSkus: SKU[] = [
  happyLighthouseEn,
  happyLighthouseEs,
  happyLighthouseBilingual,
  moonlitGardenEn,
  moonlitGardenFr,
  stargazersJourneyEn,
  stargazersJourneyBilingual,
] as SKU[];

const allWorks: Work[] = [
  happyLighthouseWork,
  moonlitGardenWork,
  stargazersJourneyWork,
] as Work[];

export function useBooks() {
  const skus = useMemo(() => allSkus, []);
  const works = useMemo(() => allWorks, []);

  const getSkuBySlug = useMemo(() => {
    return (slug: string): SKU | undefined => {
      return skus.find(sku => sku.slug === slug);
    };
  }, [skus]);

  const getWorkById = useMemo(() => {
    return (workId: string): Work | undefined => {
      return works.find(work => work.work_id === workId);
    };
  }, [works]);

  const getRelatedSkus = useMemo(() => {
    return (workId: string, excludeSkuId?: string): SKU[] => {
      return skus.filter(sku => sku.work_id === workId && sku.sku_id !== excludeSkuId);
    };
  }, [skus]);

  const getUniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    skus.forEach(sku => sku.languages.forEach(lang => langs.add(lang)));
    return Array.from(langs).sort();
  }, [skus]);

  const filterSkusByLanguage = useMemo(() => {
    return (language: string | null): SKU[] => {
      if (!language) return skus;
      return skus.filter(sku => sku.languages.includes(language));
    };
  }, [skus]);

  return {
    skus,
    works,
    getSkuBySlug,
    getWorkById,
    getRelatedSkus,
    getUniqueLanguages,
    filterSkusByLanguage,
  };
}

export function getLanguageFlag(langCode: string): string {
  const flags: Record<string, string> = {
    en: '🇬🇧',
    es: '🇪🇸',
    fr: '🇫🇷',
    eo: '🌍',
  };
  return flags[langCode] || '🌐';
}

export function getLanguageName(langCode: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    eo: 'Esperanto',
  };
  return names[langCode] || langCode.toUpperCase();
}
