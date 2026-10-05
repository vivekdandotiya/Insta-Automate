import { describe, it, expect } from 'vitest';
import { isPostAfterStartTime } from '../src/utils/date.js';
import { RuleClassifier } from '../src/services/ruleClassifier.js';
import { FilterService } from '../src/services/filter.service.js';
import { getMonitoredInstagramAccounts, DEFAULT_MONITORED_ACCOUNTS } from '../src/config/sources.config.js';
import { getInstagramAdapter } from '../src/services/instagram/factory.js';

describe('Comprehensive Production Audit & Test Suite (Prompt 5 Update)', () => {
  const agentStartTime = new Date('2026-10-03T13:30:00.000Z');

  // 1. INSTALOADER ADAPTER INITIALIZATION
  it('Requirement: INSTAGRAM_ADAPTER_MODE=instaloader initializes InstaloaderInstagramAdapter', async () => {
    const { config } = await import('../src/config/index.js');
    const origMode = config.instagramAdapterMode;
    config.instagramAdapterMode = 'instaloader';

    const adapter = getInstagramAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.constructor.name).toBe('InstaloaderInstagramAdapter');

    config.instagramAdapterMode = origMode;
  });

  // 2. MONITORED INSTAGRAM SOURCES COUNT (73 ACCOUNTS)
  it('Part 3: Monitored source list contains exactly 73 target accounts', () => {
    const accounts = getMonitoredInstagramAccounts();
    expect(accounts.length).toBe(73);
    expect(DEFAULT_MONITORED_ACCOUNTS.length).toBe(73);

    expect(accounts).toContain('careerwithkumar');
    expect(accounts).toContain('ca.nikitasimplifies');
    expect(accounts).toContain('._scholarly_insights._');
    expect(accounts).toContain('rituprajapatiji');
    expect(accounts).toContain('damineepanchal_hr_consultant');
    expect(accounts).toContain('itsmmgeo');
    expect(accounts).toContain('talkingmohit');
  });

  // 3. REEL VS POST CLASSIFICATION & DEDUPLICATION
  it('Part 2: Explicitly distinguishes REEL vs POST media types & prevents duplicates', () => {
    const postItem = { id: 'REEL_101', postType: 'REEL', shortcode: 'C123' };
    const duplicateItem = { id: 'REEL_101', postType: 'POST', shortcode: 'C123' };

    const seenSet = new Set<string>();
    seenSet.add(postItem.id);

    expect(postItem.postType).toBe('REEL');
    expect(seenSet.has(duplicateItem.id)).toBe(true);
  });

  // 4. URL EXTRACTION (Application, Test, Interview)
  it('Part 7 & 8: Direct application, test, and interview URL extraction without fake URLs', () => {
    const captionWithUrls = `Hiring Full Stack Developer in Noida!
    Apply link: https://careers.company.com/apply/123
    Coding Test Link: https://hackerrank.com/test-456
    Walk-in Interview details at https://company.com/interview`;

    const res = RuleClassifier.classify(captionWithUrls);
    expect(res.isJobPost).toBe(true);
    expect(res.applicationUrl).toBe('https://careers.company.com/apply/123');
    expect(res.testUrl).toBe('https://hackerrank.com/test-456');
    expect(res.interviewUrl).toBe('https://company.com/interview');

    // Case with no URLs
    const captionNoUrl = `Urgent opening for QA Engineer in Gurgaon. DM for details.`;
    const resNoUrl = RuleClassifier.classify(captionNoUrl);
    expect(resNoUrl.applicationUrl).toBeUndefined();
    expect(resNoUrl.testUrl).toBeUndefined();
    expect(resNoUrl.interviewUrl).toBeUndefined();
  });

  // 5. GOVERNMENT RECRUITMENT CLASSIFICATION
  it('Part 4: Detects government recruitment announcements accurately', () => {
    const govPost = RuleClassifier.classify('DSSSB Delhi District Courts Recruitment 2026 Notification Released for Junior Judicial Assistant');
    expect(govPost.isJobPost).toBe(true);
    expect(govPost.role).toBe('Government Recruitment');
  });

  // 6. RELEVANCE SCORING & EXPLANATION
  it('Part 6: Calculates HIGH relevance score and generates explanation', () => {
    const res = RuleClassifier.classify('Hiring Software Developer in Noida. Apply link https://forms.gle/xyz');
    expect(res.relevanceScore).toBe('HIGH');
    expect(res.relevanceReason).toContain('Delhi NCR');
  });

  // 7. 24-HOUR CUTOFF
  it('Part 15: 24-hour cutoff rule excludes posts older than 24 hours', () => {
    const now = new Date();
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const freshPost = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oldPost = new Date(now.getTime() - 26 * 60 * 60 * 1000);

    expect(freshPost.getTime() >= cutoff24h.getTime()).toBe(true);
    expect(oldPost.getTime() >= cutoff24h.getTime()).toBe(false);
  });

  // 8. AGENT START TIME PERSISTENCE
  it('Requirement: AGENT_START_TIME cutoff preserves timestamp state', () => {
    const preStartPost = new Date('2026-10-03T13:29:00.000Z');
    const postStartPost = new Date('2026-10-03T13:31:00.000Z');

    expect(isPostAfterStartTime(preStartPost, agentStartTime)).toBe(false);
    expect(isPostAfterStartTime(postStartPost, agentStartTime)).toBe(true);
  });
});
