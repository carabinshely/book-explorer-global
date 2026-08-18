import { Layout } from '@/components/layout/Layout';

const publicMailboxAddress = import.meta.env.VITE_PUBLIC_MAILBOX_ADDRESS || '{{PUBLIC_MAILBOX_ADDRESS}}';

const Privacy = () => (
  <Layout>
    <div className="container max-w-4xl py-12 md:py-16">
      <article className="prose prose-slate max-w-none dark:prose-invert" lang="en">
        <h1>Privacy Notice</h1>
        <p><strong>Effective:</strong> August 18, 2026</p>
        <p>This notice explains how Michael Broner, operating as Broner Books, handles personal information through BronerBooks.com, Storytime Kit requests, related email communications, and the website services described below.</p>

        <h2>Who is responsible and how to contact us</h2>
        <p>Michael Broner, operating as Broner Books, is responsible for the personal information described in this notice. Email <a href="mailto:hello@bronerbooks.com">hello@bronerbooks.com</a>, or write to: {publicMailboxAddress}.</p>

        <h2>Information we process</h2>
        <p>Depending on how you use the site, we may process your email address; Storytime Kit request, confirmation, marketing-choice, unsubscribe, and suppression status; relevant timestamps, form/source information, and consent version; coarse campaign or UTM source fields; correspondence you send us; essential site preferences such as language and privacy choices; and website analytics after you accept analytics.</p>
        <p>Hosting, network, email, and security providers may also process ordinary technical information needed to deliver and protect their services, such as Internet Protocol (IP) address, request, routing, browser/device, and security metadata. We do not intentionally place email addresses, names, subscriber IDs, or other direct identifiers in URLs, UTM parameters, or Google Analytics 4 (GA4) event payloads.</p>

        <h2>Storytime Kit requests and marketing emails</h2>
        <p>When you ask for a Storytime Kit, we use your email address to verify the request and send the Kit. Providing your email address is voluntary, but we cannot email the Kit without it. Asking for the Kit does not subscribe you to marketing.</p>
        <p>The Niran Storytime email series and occasional Broner Books news or book updates are a separate, optional choice. We send marketing only where we have the required permission. You can unsubscribe at any time using the link in a marketing email or by contacting us. Unsubscribing does not affect a Storytime Kit you already requested.</p>
        <p>Double opt-in may be used to verify that the address belongs to the person making the request and to preserve reliable permission evidence; it is not presented as a universal legal requirement.</p>

        <h2>Legal basis and permissions</h2>
        <p>For the current Israeli operation, personal information is collected voluntarily for the purposes disclosed when you provide it. Optional marketing is sent only with the required prior permission. Security, provider operations, correspondence, suppression, and legal-compliance records are used only for their disclosed and proportionate purposes or where a specific legal duty requires them.</p>
        <p>Where European Economic Area or United Kingdom data-protection law applies to a particular activity, we rely on consent for optional marketing and analytics; legitimate interests where appropriate for the limited processing needed to fulfil an explicit Storytime Kit request, respond to ordinary correspondence, maintain security, and enforce suppression preferences; and legal obligations where processing is required to handle a statutory privacy request or another specific duty. We rely on contractual necessity only where processing is genuinely necessary for an actual contract.</p>
        <p>You may withdraw consent at any time without affecting processing already carried out lawfully before withdrawal.</p>

        <h2>Analytics, essential preferences, and optional media</h2>
        <p>GA4 does not load until you select “Accept analytics.” You can reject analytics and later change your choice through “Privacy settings” in the footer. Rejecting analytics does not prevent normal access to the site.</p>
        <p>GA4 may use an IP address transiently as part of collection and location processing, but Google states that GA4 does not log or store visitor IP addresses in GA4. We do not intentionally send email addresses, names, subscriber IDs, or other direct identifiers to GA4. Google Signals, user-provided-data collection, advertising personalization, and Google Ads linking are disabled under the approved configuration. GA4 user and event-level retention is configured to 14 months; aggregated reports and provider-controlled technical records may follow different retention behavior.</p>
        <p>Essential storage may remember your privacy choice or a language/interface preference. Optional YouTube, Spotify, Apple Music, and similar players use a click-to-load design: the external service is not contacted by the embedded player until you choose to load it.</p>

        <h2>Providers and international processing</h2>
        <p>We use a small set of providers to operate the website and email flow. MailerLite provides subscriber, form, verification, and email-delivery services. Google provides GA4 and an operational email mailbox. GitHub Pages hosts the website and may process visitor IP and related security information. Cloudflare provides DNS, email-routing, and related network/security infrastructure and may process routing or security metadata in connection with those services.</p>
        <p>These providers and their subprocessors may process information in Israel, the European Economic Area, the United States, or other service locations. The applicable transfer arrangement depends on the recipient, location, and law that applies to the particular transfer. Where required, protections may include an adequacy arrangement, an applicable data-privacy framework, contractual safeguards, or another legally permitted transfer mechanism. We do not assume that every provider uses the same transfer mechanism.</p>

        <h2>How long we keep information</h2>
        <p>We keep personal information only for as long as it remains necessary for the purpose for which we use it, subject to any continuing legal, security, dispute, or compliance need.</p>
        <ul>
          <li>Unconfirmed Storytime Kit requests are removed after a short verification period when they are no longer useful.</li>
          <li>Delivery-only records are cleaned up after delivery and troubleshooting are complete and the active profile is no longer needed.</li>
          <li>Marketing subscriber information is kept while the subscription remains current and useful, subject to periodic necessity review.</li>
          <li>After an unsubscribe, bounce, spam complaint, or deletion request, we may retain the minimum suppression or compliance record needed to prevent unwanted re-mailing, demonstrate the permission history, handle a dispute, or meet a legal requirement. Unnecessary profile and engagement information is removed.</li>
          <li>Correspondence is kept according to the nature of the enquiry and any continuing business or legal need.</li>
          <li>GA4 user and event-level data is configured for 14-month retention. Aggregated reporting and provider-controlled security, fraud, billing, legal, or backup records may follow different retention rules.</li>
          <li>Genuinely aggregated, non-identifying reports may be retained while useful.</li>
        </ul>

        <h2>Your choices and privacy rights</h2>
        <p>You can withdraw marketing consent using the unsubscribe link in a marketing email or by contacting us. You can withdraw analytics consent through “Privacy settings.” Marketing withdrawal stops future marketing as soon as the unsubscribe is processed, while a minimal suppression record may remain so that we do not contact the address again by mistake.</p>
        <p>You may contact <a href="mailto:hello@bronerbooks.com">hello@bronerbooks.com</a> to ask about personal information we hold about you and to request correction, deletion, objection, withdrawal, or other rights available under the law that applies to you. Israeli law provides statutory access and correction rights; additional rights may apply where other data-protection laws apply. We may take proportionate steps to verify that you control the relevant address and will respond within the time required by applicable law.</p>
        <p>Where applicable law gives you the right to complain to a data-protection or supervisory authority, you may also use that route.</p>

        <h2>Children's content and adult data collection</h2>
        <p>Broner Books publishes books, printable activities, and other content for children and families. Our website forms, Storytime Kit requests, email subscriptions, and marketing features are intended for parents, caregivers, teachers, gift buyers, and other adults.</p>
        <p>Please use your own adult contact information and do not submit a child's name, email address, age, school, contact details, or other identifying information. Fields that a child or family may complete on a downloaded or printed Storytime Kit are intended to stay on that local copy and are not meant to be sent back to Broner Books.</p>
        <p>If we receive reliable information that a particular submission came directly from a child in circumstances where the information should not be retained, we will stop the related marketing or automation, avoid asking for additional child details, and take appropriate steps to remove the information from active systems, subject to any limited legal, security, or compliance record that must remain. Contact us if you believe a child has submitted personal information directly to Broner Books.</p>
        <p>Broner Books may separately publish child-oriented audio or video through third-party platforms such as YouTube. Viewing that content does not enroll the viewer in Broner Books email marketing. A future service designed directly for children will be reviewed separately before Broner Books adds personal-data collection, non-essential analytics, or tracking to that service.</p>

        <h2>External retailers and platforms</h2>
        <p>BronerBooks.com links to independent retailers and platforms such as Amazon, IngramSpark-related stores, YouTube, Spotify, and Apple Music. When you follow an external link or activate an external service, that provider handles the interaction under its own privacy terms. A purchase made on an external retailer is not a Broner Books checkout, and Broner Books does not receive the retailer's checkout or order data merely because the site links there.</p>

        <h2>Changes to this notice</h2>
        <p>We update this notice when our data practices or legal requirements materially change. The effective date above identifies the current version. Where required, we will provide an appropriate additional notice before a material change affecting existing subscribers takes effect.</p>
        <p><strong>Update history:</strong> August 18, 2026 — revised controller, purpose/permission, provider, retention, rights, analytics, and child-data wording following the Issue #28 legal and data-flow review.</p>
      </article>
    </div>
  </Layout>
);

export default Privacy;
