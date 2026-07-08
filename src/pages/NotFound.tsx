import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  return (
    <Layout>
      <section className="bg-warm-gradient py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <p className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.25em] text-accent">
            Page not found
          </p>
          <h1 className="mb-6 font-display text-5xl font-semibold text-foreground md:text-6xl">
            This story wandered off the shelf.
          </h1>
          <p className="mx-auto mb-3 max-w-2xl font-sans text-lg leading-relaxed text-muted-foreground">
            We could not find <span className="font-medium text-foreground">{location.pathname}</span>.
            The Broner Books collection is still here, and you can keep exploring from the links below.
          </p>
          <p className="mx-auto mb-10 max-w-xl font-sans text-base leading-relaxed text-muted-foreground">
            Try the book collection, return home, or use the main navigation to find another page.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/books">
                <BookOpen className="h-4 w-4" />
                Browse Books
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">
                <Home className="h-4 w-4" />
                Return Home
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
