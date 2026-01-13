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

  if (relatedSkus.length === 0) {
    return null;
  }

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
            <div className="flex items-center gap-3">
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
              <div>
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
              </div>
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
