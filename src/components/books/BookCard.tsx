import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SKU, getLanguageName } from '@/hooks/useBooks';
import { Badge } from '@/components/ui/badge';
import { LanguageIcon } from '@/components/books/LanguageIcon';

interface BookCardProps {
  sku: SKU;
}

export function BookCard({ sku }: BookCardProps) {
  const { t } = useLanguage();
  const hasMarketplace = Object.values(sku.amazon?.marketplaces ?? {}).some(Boolean);
  const format = sku.specs?.format;
  const pages = sku.specs?.pages;
  const imageUrl = sku.cover_image;
  const [coverFailed, setCoverFailed] = useState(false);
  const showCoverImage = Boolean(imageUrl) && !coverFailed;

  return (
    <Link
      to={`/books/${sku.slug}`}
      className="group book-card block bg-card rounded-lg overflow-hidden border border-border/50 hover:border-accent/30"
    >
      {/* Cover Image */}
      <div className="relative aspect-[7/8] overflow-hidden bg-muted">
        {showCoverImage ? (
          <img
            src={imageUrl}
            alt={`Cover of ${sku.title}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-slow group-hover:scale-105"
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(138,40,57,0.16),transparent_42%),linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--background)))] p-6 text-foreground">
            <div className="text-4xl" aria-hidden="true">📚</div>
            <p
              className="font-display text-2xl font-semibold leading-tight text-foreground"
              dangerouslySetInnerHTML={{ __html: sku.title }}
            />
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {sku.languages.map((langCode) => langCode.toUpperCase()).join(' · ')}
            </p>
          </div>
        )}
        
        {/* Edition Badge */}
        {sku.edition_type === 'bilingual' && (
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-accent text-accent-foreground"
          >
            Bilingual
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3
          className="font-display text-lg font-medium text-card-foreground line-clamp-2 group-hover:text-accent transition-colors"
          dangerouslySetInnerHTML={{ __html: sku.title }}
        />

        {/* Languages */}
        <div className="flex flex-wrap items-center gap-2">
          {sku.languages.map((langCode) => (
            <span
              key={langCode}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
              title={getLanguageName(langCode)}
            >
              <LanguageIcon langCode={langCode} decorative className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm" />
              <span>{langCode.toUpperCase()}</span>
            </span>
          ))}
          {!hasMarketplace && (
            <span className="ml-auto text-xs text-muted-foreground">
              {t.product.coming_soon}
            </span>
          )}
        </div>

        {/* Format info */}
        {(format?.length || pages) && (
          <p className="text-xs text-muted-foreground">
            {format?.length ? format.join(' / ') : null}
            {format?.length && pages ? ' • ' : null}
            {pages ? `${pages} ${t.product.pages.toLowerCase()}` : null}
          </p>
        )}
      </div>
    </Link>
  );
}
