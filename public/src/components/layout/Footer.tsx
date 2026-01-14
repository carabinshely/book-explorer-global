import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="font-display text-xl font-semibold text-foreground">
              {t.site.name}
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t.footer.tagline}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
              Navigation
            </h3>
            <nav className="flex flex-col space-y-2">
              <Link 
                to="/" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {t.nav.home}
              </Link>
              <Link 
                to="/books" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {t.nav.books}
              </Link>
              <Link 
                to="/about" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {t.nav.about}
              </Link>
              <Link 
                to="/contact" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {t.nav.contact}
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
              Legal
            </h3>
            <p className="text-sm text-muted-foreground">
              © {currentYear} {t.site.name}. {t.footer.rights}
            </p>
          </div>
        </div>

        {/* Decorative divider */}
        <div className="divider-ornament mt-8">
          <span className="text-muted-foreground text-lg">📚</span>
        </div>
      </div>
    </footer>
  );
}
