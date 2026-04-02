import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { MediaEntry, SKU, Work, getLanguageName } from '@/hooks/useBooks';
import { ChevronRight } from 'lucide-react';
import { LanguageIcon } from '@/components/books/LanguageIcon';

interface RelatedEditionsProps {
  relatedSkus: SKU[];
  work: Work;
}

export function RelatedEditions({ relatedSkus, work }: RelatedEditionsProps) {
  const { t } = useLanguage();
  const baseUrl = import.meta.env.BASE_URL;
  const mediaIcons = {
    spotify: `${baseUrl}assets/icons/spotify.svg`,
    apple_music: `${baseUrl}assets/icons/apple-music.svg`,
    youtube: `${baseUrl}assets/icons/youtube.svg`,
  } as const;

  if (relatedSkus.length === 0) {
    return null;
  }

  const getMediaEntries = (entries: MediaEntry[] | undefined, allowedLanguages: string[]) => {
    if (!entries) return [];
    return entries.filter(
      (entry) => Boolean(entry?.url) && (entry.lang === 'mixed' || allowedLanguages.includes(entry.lang))
    );
  };

  // Get the title in the related edition's primary language, or fall back
  const getTitleForSku = (sku: SKU): string => {
    const primaryLang = sku.languages[0];
    return work.family_title[primaryLang] || sku.title;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-medium text-foreground">
        {t.product.other_editions}
      </h3>
      
      <div className="grid gap-3">
        {relatedSkus.map((sku) => (
          <Link
            key={sku.sku_id}
            to={`/books/${sku.slug}`}
            className="group flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-accent/30 transition-all"
          >
            <div className="flex items-start gap-3">
              {/* Language Flags */}
              <div className="flex -space-x-1">
                {sku.languages.map((langCode) => (
                  <span
                    key={langCode} 
                    className="block"
                    title={getLanguageName(langCode)}
                    aria-label={getLanguageName(langCode)}
                  >
                    <LanguageIcon langCode={langCode} className="h-5 w-7 rounded-[2px] object-cover shadow-sm" />
                  </span>
                ))}
              </div>
              
              {/* Edition Info */}
              <div className="space-y-1">
                <p className="font-medium text-card-foreground group-hover:text-accent transition-colors">
                  {getTitleForSku(sku)}
                  {sku.languages.length === 1 && (
                    <span className="ml-2 text-muted-foreground">
                      ({sku.languages[0].toUpperCase()})
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {sku.edition_type === 'bilingual' ? 'Bilingual Edition' : 'Single Language'}
                  {sku.specs?.format?.[0] ? ` • ${sku.specs.format[0]}` : null}
                  {!Object.values(sku.amazon?.marketplaces ?? {}).some(Boolean) && (
                    <span className="text-xs text-muted-foreground">
                      {t.product.coming_soon}
                    </span>
                  )}
                </p>
                {(() => {
                  const availability = {
                    spotify: getMediaEntries(sku.media?.spotify, sku.languages),
                    appleMusic: getMediaEntries(sku.media?.apple_music, sku.languages),
                    youtube: getMediaEntries(sku.media?.youtube, sku.languages),
                  };
                  const hasAny =
                    availability.spotify.length > 0 ||
                    availability.appleMusic.length > 0 ||
                    availability.youtube.length > 0;
                  if (!hasAny) return null;
                  const showLanguageBadges = sku.languages.length > 1;
                  const buildTitle = (platform: string, entries: MediaEntry[]) => {
                    const langs = entries.map((entry) => entry.lang).filter((lang) => lang !== 'mixed');
                    if (langs.length === 0) return `${t.a11y.available_on} ${platform}`;
                    const languageNames = langs.map(getLanguageName).join(', ');
                    return `${t.a11y.available_on} ${platform} (${languageNames})`;
                  };

                  return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {availability.spotify.length > 0 && (
                        <span className="flex items-center">
                          <img
                            src={mediaIcons.spotify}
                            alt="Spotify"
                            title={buildTitle('Spotify', availability.spotify)}
                            className="h-4 w-4"
                          />
                          {showLanguageBadges && (
                            <span className="-ml-1 flex -space-x-1 text-sm">
                              {availability.spotify.filter((entry) => entry.lang !== 'mixed').map(({ lang }) => (
                                <span
                                  key={`spotify-${lang}`}
                                  title={getLanguageName(lang)}
                                  aria-label={getLanguageName(lang)}
                                >
                                  <LanguageIcon langCode={lang} className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm" />
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      )}
                      {availability.appleMusic.length > 0 && (
                        <span className="flex items-center">
                          <img
                            src={mediaIcons.apple_music}
                            alt="Apple Music"
                            title={buildTitle('Apple Music', availability.appleMusic)}
                            className="h-4 w-4"
                          />
                          {showLanguageBadges && (
                            <span className="-ml-1 flex -space-x-1 text-sm">
                              {availability.appleMusic.filter((entry) => entry.lang !== 'mixed').map(({ lang }) => (
                                <span
                                  key={`apple-music-${lang}`}
                                  title={getLanguageName(lang)}
                                  aria-label={getLanguageName(lang)}
                                >
                                  <LanguageIcon langCode={lang} className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm" />
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      )}
                      {availability.youtube.length > 0 && (
                        <span className="flex items-center">
                          <img
                            src={mediaIcons.youtube}
                            alt="YouTube"
                            title={buildTitle('YouTube', availability.youtube)}
                            className="h-4 w-4"
                          />
                          {showLanguageBadges && (
                            <span className="-ml-1 flex -space-x-1 text-sm">
                              {availability.youtube.filter((entry) => entry.lang !== 'mixed').map(({ lang }) => (
                                <span
                                  key={`youtube-${lang}`}
                                  title={getLanguageName(lang)}
                                  aria-label={getLanguageName(lang)}
                                >
                                  <LanguageIcon langCode={lang} className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm" />
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
