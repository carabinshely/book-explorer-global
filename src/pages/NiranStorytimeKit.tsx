import { Layout } from '@/components/layout/Layout';
import { NiranStorytimeSignup } from '@/components/niran/NiranStorytimeSignup';

const NiranStorytimeKit = () => {
  return (
    <Layout>
      <section className="py-12 md:py-20 border-b border-border" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
            The Lost Umbrella of Niran
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-5">
            Get the free Magic Umbrella Storytime Kit
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A printable read, talk, and color companion for parents, caregivers, teachers, gift buyers, and other adults reading with children.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl space-y-10">
          <NiranStorytimeSignup />

          <div className="space-y-4">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground">
              A gentle conversation after the story
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              When something special goes missing, children often notice more than the missing object. Try asking: “Who could you ask for help?” and “What can make a treasured thing feel special even when it is not with you?”
            </p>
            <p className="text-muted-foreground">
              The complete Storytime Kit expands this into a short parent-guided read, talk, and color activity.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NiranStorytimeKit;
