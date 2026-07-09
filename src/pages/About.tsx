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
          <div className="mx-auto space-y-12">
            {/* Mission */}
            <section className="space-y-4" aria-labelledby="about-mission">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                {t.about.section_labels.mission}
              </p>
              <h2 id="about-mission" className="font-display text-2xl md:text-3xl font-medium text-foreground">
                {t.about.mission_title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.about.mission}
              </p>
            </section>

            <div className="h-px bg-border" aria-hidden="true" />

            {/* Story */}
            <section className="space-y-4" aria-labelledby="about-story">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                {t.about.section_labels.studio}
              </p>
              <h2 id="about-story" className="font-display text-2xl md:text-3xl font-medium text-foreground">
                {t.about.story_title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.about.story}
              </p>
            </section>

            {/* Values */}
            <section className="border-y border-border py-8" aria-labelledby="about-principles">
              <h2 id="about-principles" className="font-display text-2xl font-medium text-foreground mb-6">
                {t.about.section_labels.principles}
              </h2>
              <dl className="divide-y divide-border">
                <div className="grid gap-2 py-5 md:grid-cols-[12rem_1fr] md:gap-8">
                  <dt className="font-display text-lg font-medium text-foreground">
                    {t.about.values.global_reach_title}
                  </dt>
                  <dd className="text-muted-foreground">
                    {t.about.values.global_reach_body}
                  </dd>
                </div>
                <div className="grid gap-2 py-5 md:grid-cols-[12rem_1fr] md:gap-8">
                  <dt className="font-display text-lg font-medium text-foreground">
                    {t.about.values.quality_first_title}
                  </dt>
                  <dd className="text-muted-foreground">
                    {t.about.values.quality_first_body}
                  </dd>
                </div>
                <div className="grid gap-2 py-5 md:grid-cols-[12rem_1fr] md:gap-8">
                  <dt className="font-display text-lg font-medium text-foreground">
                    {t.about.values.education_title}
                  </dt>
                  <dd className="text-muted-foreground">
                    {t.about.values.education_body}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
