import { useMemo } from 'react';
import { allSkus } from '@/data/skus';
import { allWorks } from '@/data/works';

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

const skusSource = allSkus as SKU[];
const worksSource = allWorks as Work[];

export function useBooks() {
  const skus = useMemo(() => skusSource, []);
  const works = useMemo(() => worksSource, []);

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
    ru: '🇷🇺',
    he: '🇮🇱',
  };
  return flags[langCode] || '🌐';
}

export function getLanguageName(langCode: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    eo: 'Esperanto',
    ru: 'Русский',
    he: 'עברית',
  };
  return names[langCode] || langCode.toUpperCase();
}
