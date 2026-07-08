import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <Layout>
      <section className="bg-warm-gradient py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <p className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.25em] text-accent">
            {t.not_found.eyebrow}
          </p>
          <h1 className="mb-6 font-display text-5xl font-semibold text-foreground md:text-6xl">
            {t.not_found.title}
          </h1>
          <p className="mx-auto mb-3 max-w-2xl font-sans text-lg leading-relaxed text-muted-foreground">
            {t.not_found.missing_path_prefix}{' '}
            <bdi className="font-medium text-foreground">{location.pathname}</bdi>.{' '}
            {t.not_found.missing_path_suffix}
          </p>
          <p className="mx-auto mb-10 max-w-xl font-sans text-base leading-relaxed text-muted-foreground">
            {t.not_found.guidance}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/books">
                <BookOpen className="h-4 w-4" />
                {t.not_found.browse_books}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">
                <Home className="h-4 w-4" />
                {t.not_found.return_home}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
