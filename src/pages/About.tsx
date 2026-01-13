import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';

const About = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Header */}
      <section className="py-12 md:py-20 border-b border-border" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container text-center">
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
            {t.about.title}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <div className="prose prose-lg mx-auto space-y-12">
            {/* Mission */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground m-0">
                  {t.about.mission_title}
                </h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.about.mission}
              </p>
            </div>

            <div className="divider-ornament">
              <span className="text-xl">📖</span>
            </div>

            {/* Story */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✨</span>
                <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground m-0">
                  {t.about.story_title}
                </h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.about.story}
              </p>
            </div>

            {/* Values Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <div className="text-center p-6 bg-secondary/50 rounded-lg">
                <span className="text-4xl mb-3 block">🌍</span>
                <h3 className="font-display text-lg font-medium text-foreground mb-2">Global Reach</h3>
                <p className="text-sm text-muted-foreground">Connecting readers across languages and cultures</p>
              </div>
              <div className="text-center p-6 bg-secondary/50 rounded-lg">
                <span className="text-4xl mb-3 block">📚</span>
                <h3 className="font-display text-lg font-medium text-foreground mb-2">Quality First</h3>
                <p className="text-sm text-muted-foreground">Carefully curated editions with beautiful design</p>
              </div>
              <div className="text-center p-6 bg-secondary/50 rounded-lg">
                <span className="text-4xl mb-3 block">💡</span>
                <h3 className="font-display text-lg font-medium text-foreground mb-2">Education</h3>
                <p className="text-sm text-muted-foreground">Making language learning accessible and joyful</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
