import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Mail, Twitter, Instagram } from 'lucide-react';

const Contact = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Header */}
      <section className="py-12 md:py-20 border-b border-border" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container text-center">
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
            {t.contact.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t.contact.subtitle}
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-12 md:py-16">
        <div className="container max-w-2xl">
          <div className="grid gap-8">
            {/* Email */}
            <div className="p-8 bg-card rounded-lg border border-border text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-accent" />
              </div>
              <h2 className="font-display text-xl font-medium text-foreground">
                {t.contact.email_label}
              </h2>
              <Button asChild variant="outline" size="lg" className="items-center">
                <a href={`mailto:${t.contact.email}`}>
                  <span className="leading-none">{t.contact.email}</span>
                </a>
              </Button>
            </div>

            {/* Social Links */}
            <div className="p-8 bg-card rounded-lg border border-border text-center space-y-4">
              <h2 className="font-display text-xl font-medium text-foreground">
                {t.contact.follow_label}
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="outline" className="h-12 px-4 gap-2 items-center" asChild>
                  <a 
                    href="https://twitter.com/BronerBooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                    <span className="text-sm leading-none">@BronerBooks</span>
                  </a>
                </Button>
                <Button variant="outline" className="h-12 px-4 gap-2 items-center" asChild>
                  <a 
                    href="https://instagram.com/BronerBooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                    <span className="text-sm leading-none">@BronerBooks</span>
                  </a>
                </Button>
              </div>
            </div>

            {/* Decorative Quote */}
            <blockquote className="literary-quote text-lg text-center mt-8">
              Reading is a conversation. All books talk. But a good book listens as well.
              <footer className="mt-3 text-sm text-muted-foreground not-italic">
                — Mark Haddon
              </footer>
            </blockquote>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
