# Google Analytics Operations

This site uses Google Analytics 4 for campaign validation and basic funnel
measurement.

## Current Configuration

- GA4 Measurement ID: `G-DD2217GBC7`
- Code default: `src/lib/analytics.ts`
- Route tracking: `src/components/analytics/AnalyticsRouteTracker.tsx`
- Custom event currently tracked: `amazon_click`
- Hosting override: `VITE_GA_MEASUREMENT_ID`

The measurement ID is not a secret. It is visible in the website JavaScript by
design. Use the environment variable only when the ID needs to change without a
code edit.

## Create the GA4 Account

1. Go to `https://analytics.google.com`.
2. Click `Start Measuring`.
3. Create an account named `Broner Books`.
4. Create a property named `BronerBooks.com`.
5. Use `USD` as the currency unless business reporting changes.
6. Use the business reporting time zone that should define weekly campaign
   reports.
7. Add a `Web` data stream for the production website.
8. Enable Enhanced Measurement.
9. Copy the Measurement ID and confirm it is `G-DD2217GBC7`.

## Deploy and Verify

1. Deploy the website build.
2. Open Google Analytics.
3. Go to `Reports > Realtime`.
4. Visit the live website in a normal browser.
5. Open a book detail page.
6. Click the Amazon CTA once.
7. Confirm that page views appear in Realtime.
8. Confirm that the `amazon_click` event appears after GA processes events.

If the production host injects a different environment value, set
`VITE_GA_MEASUREMENT_ID=G-DD2217GBC7` and redeploy.

## Weekly Reports

Use GA4 scheduled emails first. This keeps the workflow manual enough for the
Niran validation campaign while still creating a repeatable review habit.

Recommended scheduled reports:

- Traffic acquisition: weekly CSV
- Pages and screens: weekly CSV
- Events: weekly CSV

In Google Analytics:

1. Open the report.
2. Set the date range to the last 7 days.
3. Apply any campaign or source comparison needed.
4. Click `Share this report`.
5. Choose `Schedule Email`.
6. Select weekly frequency.
7. Choose CSV for analysis or PDF for a quick human review.

## Weekly Analysis Checklist

Create a weekly marketing report in
`bronerbooks-marketing-ops/06_metrics/reports/`.

Record:

- reporting week
- total users
- sessions
- top traffic sources
- top landing pages
- Niran product detail views
- Amazon CTA clicks
- UTM campaign performance
- lead magnet clicks or signups after that flow exists
- strongest message or channel signal
- weakest message or channel signal
- next action for the following week

Compare results against the Niran validation campaign goals in
`bronerbooks-marketing-ops/04_campaigns/2026-q2-niran-validation/campaign.yaml`.

## Event Naming

Keep custom events plain, lowercase, and stable:

- `amazon_click`
- future: `lead_magnet_signup_click`
- future: `language_switch`
- future: `book_detail_view`

Do not create one-off event names for the same behavior.
