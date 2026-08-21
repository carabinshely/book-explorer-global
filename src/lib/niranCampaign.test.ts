import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disableGoogleAnalytics, enableGoogleAnalytics } from './analytics';
import {
  NIRAN_CAMPAIGN_ID,
  readNiranAttribution,
  sanitizeNiranEventProperties,
  trackNiranEvent,
} from './niranCampaign';

describe('Niran campaign analytics contract', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    window.gtag = vi.fn();
    disableGoogleAnalytics('G-TEST123');
    vi.mocked(window.gtag).mockClear();
  });

  it('captures only the approved current-page UTM fields', () => {
    expect(
      readNiranAttribution(
        '?utm_source=instagram&utm_medium=organic_social&utm_campaign=niran_storytime_2026&utm_content=post_01&utm_term=parent_utility&email=person%40example.test&arbitrary=nope'
      )
    ).toEqual({
      utm_source: 'instagram',
      utm_medium: 'organic_social',
      utm_campaign: 'niran_storytime_2026',
      utm_content: 'post_01',
      utm_term: 'parent_utility',
    });
  });

  it('bounds attribution values', () => {
    const value = 'x'.repeat(200);
    expect(readNiranAttribution(`?utm_content=${value}`).utm_content).toHaveLength(120);
  });

  it('removes direct identifiers and child fields from event properties', () => {
    expect(
      sanitizeNiranEventProperties({
        email: 'person@example.test',
        subscriber_id: '123',
        confirmation_token: 'secret',
        child_name: 'Nope',
        utm_source: 'instagram',
        page_path: '/niran-storytime-kit',
      })
    ).toEqual({
      utm_source: 'instagram',
      page_path: '/niran-storytime-kit',
    });
  });

  it('does not emit campaign events before analytics consent', () => {
    trackNiranEvent('lead_form_started', { page_path: '/niran-storytime-kit' });
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('emits allowlisted campaign data after analytics consent', () => {
    enableGoogleAnalytics('G-TEST123');
    vi.mocked(window.gtag).mockClear();

    trackNiranEvent('lead_form_submitted', {
      email: 'person@example.test',
      utm_source: 'instagram',
      page_path: '/niran-storytime-kit',
    });

    expect(window.gtag).toHaveBeenCalledWith('event', 'lead_form_submitted', {
      campaign_id: NIRAN_CAMPAIGN_ID,
      utm_source: 'instagram',
      page_path: '/niran-storytime-kit',
    });
  });
});
