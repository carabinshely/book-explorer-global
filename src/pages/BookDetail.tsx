import { useParams, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBooks, getLanguageFlag, getLanguageName } from '@/hooks/useBooks';
import { getBookCover } from '@/assets/bookImages';
import { Layout } from '@/components/layout/Layout';
import { ImageGallery } from '@/components/books/ImageGallery';
import { MediaEmbeds } from '@/components/books/MediaEmbeds';
import { RelatedEditions } from '@/components/books/RelatedEditions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const BookDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const { getSkuBySlug, getWorkById, getRelatedSkus } = useBooks();

  const sku = slug ? getSkuBySlug(slug) : undefined;
  const work = sku ? getWorkById(sku.work_id) : undefined;
  const relatedSkus = sku ? getRelatedSkus(sku.work_id, sku.sku_id) : [];

  // Get cover image
  const coverImage = sku ? getBookCover(sku.sku_id) : undefined;
  const galleryImages = coverImage ? [coverImage] : [];

  // If SKU not found, redirect to books page
  if (!sku || !work) {
    return <Navigate to="/books" replace />;
  }

  // Get first Amazon marketplace link
  const amazonUrl = Object.values(sku.amazon?.marketplaces ?? {})[0];
  const format = sku.specs?.format;
  const pages = sku.specs?.pages ?? work.default_specs?.pages;
  const dimensions = sku.specs?.dimensions_mm ?? work.default_specs?.dimensions_mm;
  const isbn = sku.specs?.isbn;
  const hasSpecs = Boolean(format?.length || pages || dimensions || isbn);

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container py-4">
          <Link 
            to="/books" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.nav.books}
          </Link>
        </div>
      </div>

      {/* Product Details */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="group">
              <ImageGallery images={galleryImages} alt={sku.title} />
            </div>

            {/* Product Info */}
            <div className="space-y-6 lg:py-4">
              {/* Edition Badge */}
              {sku.edition_type === 'bilingual' && (
                <Badge variant="secondary" className="bg-accent/10 text-accent">
                  Bilingual Edition
                </Badge>
              )}

              {/* Title */}
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                {sku.title}
              </h1>

              {/* Description */}
              <div
                className="text-lg text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sku.description }}
              />

              {/* Languages */}
              <div className="flex flex-wrap gap-2">
                {sku.languages.map((langCode) => (
                  <span
                    key={langCode}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm"
                  >
                    <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
                    <span>{getLanguageName(langCode)}</span>
                  </span>
                ))}
              </div>

              {/* Amazon Button */}
              {amazonUrl ? (
                <Button asChild size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                  <a 
                    href={amazonUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    {t.product.buy_on_amazon}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {t.product.coming_soon}
                </p>
              )}

              {/* Specifications */}
              {hasSpecs && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h2 className="font-display text-xl font-medium text-foreground">
                    {t.product.specifications}
                  </h2>
                  
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    {format?.length && (
                      <div>
                        <dt className="text-muted-foreground">{t.product.format}</dt>
                        <dd className="font-medium text-foreground">{format.join(', ')}</dd>
                      </div>
                    )}
                    {pages && (
                      <div>
                        <dt className="text-muted-foreground">{t.product.pages}</dt>
                        <dd className="font-medium text-foreground">{pages}</dd>
                      </div>
                    )}
                    {dimensions && (
                      <div>
                        <dt className="text-muted-foreground">{t.product.dimensions}</dt>
                        <dd className="font-medium text-foreground">{dimensions}</dd>
                      </div>
                    )}
                    {isbn && (
                      <div>
                        <dt className="text-muted-foreground">ISBN</dt>
                        <dd className="font-medium text-foreground">{isbn}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Media & Related Editions */}
      <section className="py-8 md:py-12 border-t border-border bg-secondary/20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Media Embeds */}
            <MediaEmbeds media={sku.media} />

            {/* Related Editions */}
            <RelatedEditions relatedSkus={relatedSkus} work={work} />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BookDetail;
