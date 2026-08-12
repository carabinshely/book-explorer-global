import { Layout } from '@/components/layout/Layout';

const publicMailboxAddress = import.meta.env.VITE_PUBLIC_MAILBOX_ADDRESS || '{{PUBLIC_MAILBOX_ADDRESS}}';

const Privacy = () => (
  <Layout>
    <div className="container max-w-4xl py-12 md:py-16">
      <article className="prose prose-slate max-w-none dark:prose-invert" lang="en">
        <h1>Privacy Notice</h1>
        <p><strong>Effective:</strong> August 9, 2026</p>
        <p>This notice explains how Broner Books, operated by Michael Broner, handles personal information through BronerBooks.com, the Magic Umbrella Storytime Kit form, and related email communications.</p>

        <h2>Contact and controller</h2>
        <p>The controller is Broner Books, operated by Michael Broner. Email <a href="mailto:hello@bronerbooks.com">hello@bronerbooks.com</a>, or write to: {publicMailboxAddress}.</p>

        <h2>Information we collect</h2>
        <p>We may collect your email address; consent choices and supporting evidence such as time, IP address, source, and consent version; source and campaign fields; an optional language preference; links clicked in our emails; correspondence you send us; and website analytics only after you accept analytics cookies. We do not place email addresses or subscriber identifiers in URLs, campaign parameters, analytics, or ordinary website logs.</p>

        <h2>How and why we use it</h2>
        <p>We use information to confirm and deliver a requested kit, send email only when consented, manage preferences, measure the funnel, protect our services, comply with law, and enforce opt-outs. Kit delivery is separate from optional marketing consent. We do not sell or rent subscriber data, use it for targeted advertising, or use advertising pixels in this campaign.</p>

        <h2>Legal bases — provisional pending review</h2>
        <p>This proposed mapping remains subject to owner and legal review before publication. Requested kit confirmation and delivery are based on taking steps at your request and providing the service you asked for. Optional marketing emails and Google Analytics are based on consent. Security, legal compliance, and opt-out enforcement may rely on legitimate interests or legal obligations where applicable. You may withdraw consent at any time without affecting processing already carried out lawfully.</p>

        <h2>Providers and international processing</h2>
        <p>We use MailerLite for forms and email delivery, Google Analytics for consented website analytics, GitHub Pages for website hosting, Cloudflare for DNS and email routing, and an operational Gmail mailbox for correspondence. These providers may process information internationally. MailerLite provides a data processing agreement and Standard Contractual Clauses for relevant transfers. When you follow an external link, including to Amazon, that destination handles information under its own privacy terms.</p>

        <h2>Analytics, essential preferences, and external media</h2>
        <p>Google Analytics 4 does not load until you select “Accept analytics.” You can reject it and later change your choice through “Privacy settings” in the footer. We ask again after six months. Google Signals, advertising features, and Ads linking are disabled, and analytics user and event data is retained for 14 months. Essential storage, such as your selected site language and storage needed to submit a requested form, is separate from analytics. Optional YouTube, Spotify, Apple Music, and similar players load only after you explicitly request them.</p>

        <h2>Retention</h2>
        <ul>
          <li>Unconfirmed signups are forgotten after 30 days.</li>
          <li>Kit-only recipients are forgotten 30 days after successful delivery.</li>
          <li>Consented subscribers are kept while subscribed and meaningfully active.</li>
          <li>At 23 months without a click, preference update, reply, or renewed confirmation, we send one re-permission message; without a response, we unsubscribe the address at 24 months. Opens do not count.</li>
          <li>Ordinary unsubscribes retain only the minimum suppression and consent history needed to honor the opt-out; nonessential profile information is removed.</li>
          <li>Bounces and spam complaints are suppressed immediately, with nonessential profile information removed within 90 days.</li>
          <li>Temporary approved exports are kept outside Git and deleted within seven days.</li>
          <li>Ordinary correspondence is kept for 24 months after resolution, unless a transaction, dispute, or law requires longer.</li>
          <li>Aggregated, non-identifying reports may be retained indefinitely.</li>
        </ul>

        <h2>Your choices and rights</h2>
        <p>You may request access, correction, withdrawal of consent, objection, or deletion by emailing <a href="mailto:hello@bronerbooks.com">hello@bronerbooks.com</a>. We may verify that you control the address. Marketing withdrawal takes effect immediately. For a verified erasure request, we use MailerLite’s “Forget” process, remove local exports, and aim to complete the request within 30 days, unless specific law requires isolated retention.</p>

        <h2>Adults only</h2>
        <p>Our services and forms are intended for parents, caregivers, teachers, gift buyers, and other adults. Do not submit a child’s name, age, school, contact details, or personal circumstances. We do not knowingly collect children’s information; contact us to request removal if it was submitted.</p>

        <h2>Changes</h2>
        <p>We will update the effective date and maintain an update history here. For material changes affecting subscribers, we will also provide an appropriate notice through the website or email before the change takes effect where required.</p>
        <p><strong>Update history:</strong> August 9, 2026 — initial notice.</p>
      </article>
    </div>
  </Layout>
);

export default Privacy;
