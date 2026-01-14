import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBooks } from '@/hooks/useBooks';
import { Layout } from '@/components/layout/Layout';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  const { t } = useLanguage();
  const { skus } = useBooks();

  const featuredBooks = useMemo(() => {
    const count = Math.min(3, skus.length);
    if (count === 0) return [];
    if (typeof window === 'undefined') return skus.slice(0, count);

    const storageKey = 'featuredSkus';

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const storedIds = JSON.parse(stored);
        if (Array.isArray(storedIds)) {
          const mapped = storedIds
            .map((id: string) => skus.find(sku => sku.sku_id === id))
            .filter(Boolean);
          if (mapped.length === count) {
            return mapped;
          }
        }
      }
    } catch {
      // Ignore invalid storage data and reselect.
    }

    const shuffled = [...skus];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selection = shuffled.slice(0, count);

    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(selection.map(sku => sku.sku_id))
      );
    } catch {
      // Ignore storage write errors.
    }

    return selection;
  }, [skus]);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute inset-0 -z-10 opacity-30">
          <svg className="absolute top-0 right-0 w-1/2 h-full text-accent/10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="80" cy="20" r="60" fill="currentColor" />
          </svg>
        </div>
        
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in-up">
            {/* Decorative element */}
            <div className="text-5xl mb-4">📚</div>
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold text-foreground tracking-tight text-balance">
              {t.home.hero_title}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              {t.home.hero_subtitle}
            </p>
            
            <div className="pt-4">
              <Button asChild size="lg" className="group bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/books">
                  {t.home.browse_books}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="divider-ornament mb-6">
              <span className="text-2xl">✨</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground">
              {t.home.featured}
            </h2>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 stagger-children">
            {featuredBooks.map((sku) => (
              <BookCard key={sku.sku_id} sku={sku} />
            ))}
          </div>

          {/* View All Link */}
          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg" className="group">
              <Link to="/books">
                {t.nav.books}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container max-w-3xl">
          <blockquote className="literary-quote text-xl md:text-2xl text-center">
            A book is a garden, an orchard, a storehouse, a party, a company by the way, 
            a counselor, a multitude of counselors.
            <footer className="mt-4 text-base text-muted-foreground not-italic">
              — Charles Baudelaire
            </footer>
          </blockquote>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
