import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SKU, getLanguageFlag, getLanguageName } from '@/hooks/useBooks';
import { getBookCover } from '@/assets/bookImages';
import { Badge } from '@/components/ui/badge';

interface BookCardProps {
  sku: SKU;
}

export function BookCard({ sku }: BookCardProps) {
  const { t } = useLanguage();
  const format = sku.specs?.format;
  const pages = sku.specs?.pages;

  // Use generated cover image or placeholder
  const imageUrl = getBookCover(sku.sku_id) || '/placeholder.svg';

  return (
    <Link
      to={`/books/${sku.slug}`}
      className="group book-card block bg-card rounded-lg overflow-hidden border border-border/50 hover:border-accent/30"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={`Cover of ${sku.title}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-slow group-hover:scale-105"
          loading="lazy"
        />
        
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
        <h3 className="font-display text-lg font-medium text-card-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {sku.title}
        </h3>

        {/* Languages */}
        <div className="flex flex-wrap gap-2">
          {sku.languages.map((langCode) => (
            <span
              key={langCode}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
              title={getLanguageName(langCode)}
            >
              <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
              <span>{langCode.toUpperCase()}</span>
            </span>
          ))}
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
