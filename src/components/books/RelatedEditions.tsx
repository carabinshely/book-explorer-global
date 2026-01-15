import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SKU, Work, getLanguageFlag, getLanguageName } from '@/hooks/useBooks';
import { ChevronRight } from 'lucide-react';

interface RelatedEditionsProps {
  relatedSkus: SKU[];
  work: Work;
}

export function RelatedEditions({ relatedSkus, work }: RelatedEditionsProps) {
  const { t, lang } = useLanguage();
  const baseUrl = import.meta.env.BASE_URL;
  const mediaIcons = {
    spotify: `${baseUrl}assets/icons/spotify.svg`,
    apple_music: `${baseUrl}assets/icons/apple-music.svg`,
    youtube: `${baseUrl}assets/icons/youtube.svg`,
  } as const;

  if (relatedSkus.length === 0) {
    return null;
  }

  const hasMediaEntries = (entries?: Record<string, string>) =>
    entries ? Object.keys(entries).some((langCode) => langCode !== 'mixed') : false;

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
                  {sku.edition_type === 'bilingual' ? 'Bilingual Edition' : 'Single Language'} • {sku.specs.format[0]}
                </p>
                {(() => {
                  const availability = {
                    spotify: hasMediaEntries(sku.media.spotify),
                    appleMusic: hasMediaEntries(sku.media.apple_music),
                    youtube: hasMediaEntries(sku.media.youtube),
                  };
                  const hasAny = availability.spotify || availability.appleMusic || availability.youtube;
                  if (!hasAny) return null;

                  return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {availability.spotify && (
                        <img
                          src={mediaIcons.spotify}
                          alt="Spotify"
                          title={`${t.a11y.available_on} Spotify`}
                          className="h-4 w-4"
                        />
                      )}
                      {availability.appleMusic && (
                        <img
                          src={mediaIcons.apple_music}
                          alt="Apple Music"
                          title={`${t.a11y.available_on} Apple Music`}
                          className="h-4 w-4"
                        />
                      )}
                      {availability.youtube && (
                        <img
                          src={mediaIcons.youtube}
                          alt="YouTube"
                          title={`${t.a11y.available_on} YouTube`}
                          className="h-4 w-4"
                        />
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
