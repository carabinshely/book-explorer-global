import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBooks, getLanguageName } from '@/hooks/useBooks';
import { Layout } from '@/components/layout/Layout';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Books = () => {
  const { t } = useLanguage();
  const { skus, getUniqueLanguages, filterSkusByLanguage } = useBooks();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<'all' | 'single' | 'bilingual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const languages = getUniqueLanguages;
  const filteredBooks = useMemo(() => {
    let result = filterSkusByLanguage(selectedLanguage);
    if (selectedEdition !== 'all') {
      result = result.filter((sku) =>
      selectedEdition === 'single' ? sku.languages.length === 1 : sku.languages.length === 2
      );
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((sku) => sku.title.toLowerCase().includes(query));
    }
    return result;
  }, [filterSkusByLanguage, searchQuery, selectedEdition, selectedLanguage]);

  return (
    <Layout>
      {/* Header */}
      <section className="py-12 md:py-16 border-b border-border" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container text-center">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            {t.catalog.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.catalog.subtitle}
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="py-6 border-b border-border bg-card/50 sticky top-16 z-40 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by language">
            <Button
              variant={selectedLanguage === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLanguage(null)}
              className={cn(
                selectedLanguage === null && "bg-accent hover:bg-accent/90"
              )}
            >
              {t.catalog.all_languages}
            </Button>
            
            {languages.map((langCode) => (
              <Button
                key={langCode}
                variant={selectedLanguage === langCode ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLanguage(langCode)}
                className={cn(
                  selectedLanguage === langCode && "bg-accent hover:bg-accent/90"
                )}
              >
                {getLanguageName(langCode)}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3" role="group" aria-label="Filter by edition">
            <Button
              variant={selectedEdition === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedEdition('all')}
              className={cn(
                selectedEdition === 'all' && "bg-accent hover:bg-accent/90"
              )}
            >
              {t.catalog.edition_all}
            </Button>
            <Button
              variant={selectedEdition === 'single' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedEdition('single')}
              className={cn(
                selectedEdition === 'single' && "bg-accent hover:bg-accent/90"
              )}
            >
              {t.catalog.edition_single}
            </Button>
            <Button
              variant={selectedEdition === 'bilingual' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedEdition('bilingual')}
              className={cn(
                selectedEdition === 'bilingual' && "bg-accent hover:bg-accent/90"
              )}
            >
              {t.catalog.edition_bilingual}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.catalog.search_placeholder}
                aria-label={t.catalog.search_placeholder}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground"
              >
                {t.catalog.clear_search}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Books Grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-6">
            {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
            {selectedLanguage && ` in ${getLanguageName(selectedLanguage)}`}
          </p>

          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filteredBooks.map((sku) => (
                <BookCard key={sku.sku_id} sku={sku} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                {t.catalog.no_results}
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setSelectedLanguage(null);
                  setSelectedEdition('all');
                  setSearchQuery('');
                }}
                className="mt-4 text-accent"
              >
                {t.catalog.view_all}
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Books;
