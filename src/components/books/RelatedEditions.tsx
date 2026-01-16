import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SKU, Work, getLanguageFlag, getLanguageName } from '@/hooks/useBooks';
import { ChevronRight } from 'lucide-react';

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

  const getMediaLanguages = (
    entries: Record<string, string> | undefined,
    allowedLanguages: string[]
  ) => {
    if (!entries) return [];
    return Object.keys(entries).filter(
      (langCode) => langCode !== 'mixed' && allowedLanguages.includes(langCode)
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
                    className="text-lg"
                    title={getLanguageName(langCode)}
                    aria-label={getLanguageName(langCode)}
                  >
                    {getLanguageFlag(langCode)}
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
                <p className="text-sm text-muted-foreground">
                  {sku.edition_type === 'bilingual' ? 'Bilingual Edition' : 'Single Language'}
                  {sku.specs?.format?.[0] ? ` • ${sku.specs.format[0]}` : null}
                </p>
                {(() => {
                  const availability = {
                    spotify: getMediaLanguages(sku.media?.spotify, sku.languages),
                    appleMusic: getMediaLanguages(sku.media?.apple_music, sku.languages),
                    youtube: getMediaLanguages(sku.media?.youtube, sku.languages),
                  };
                  const hasAny =
                    availability.spotify.length > 0 ||
                    availability.appleMusic.length > 0 ||
                    availability.youtube.length > 0;
                  if (!hasAny) return null;
                  const showLanguageBadges = sku.languages.length > 1;
                  const buildTitle = (platform: string, langs: string[]) => {
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
                              {availability.spotify.map((langCode) => (
                                <span
                                  key={`spotify-${langCode}`}
                                  title={getLanguageName(langCode)}
                                  aria-label={getLanguageName(langCode)}
                                >
                                  {getLanguageFlag(langCode)}
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
                              {availability.appleMusic.map((langCode) => (
                                <span
                                  key={`apple-music-${langCode}`}
                                  title={getLanguageName(langCode)}
                                  aria-label={getLanguageName(langCode)}
                                >
                                  {getLanguageFlag(langCode)}
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
                              {availability.youtube.map((langCode) => (
                                <span
                                  key={`youtube-${langCode}`}
                                  title={getLanguageName(langCode)}
                                  aria-label={getLanguageName(langCode)}
                                >
                                  {getLanguageFlag(langCode)}
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
