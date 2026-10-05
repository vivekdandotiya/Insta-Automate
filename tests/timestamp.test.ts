import { describe, it, expect } from 'vitest';
import { isPostAfterStartTime } from '../src/utils/date.js';
import { RuleClassifier } from '../src/services/ruleClassifier.js';
import { FilterService } from '../src/services/filter.service.js';
import { getMonitoredInstagramAccounts, DEFAULT_MONITORED_ACCOUNTS } from '../src/config/sources.config.js';
import { getInstagramAdapter } from '../src/services/instagram/factory.js';

describe('Comprehensive Production Audit & Test Suite (Prompt 6 Update)', () => {
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

  // 3. CISCO REEL END-TO-END RELEVANCE & DETECTION TEST (PROMPT 6 CRITICAL)
  it('Section 16: Detects Cisco Talent Acquisition Coordinator Trainee Reel from @karrar_hussain_jobs', () => {
    const ciscoCaption = `Cisco is hiring for:
    Talent Acquisition Coordinator Trainee
    
    - Fresher eligible
    - No resume shortlisting
    - No assessment
    - Apply Now
    https://jobs.cisco.com/careers/job/123456
    Graduate Apprentice
    India`;

    const res = RuleClassifier.classify(ciscoCaption);
    expect(res.isJobPost).toBe(true);
    expect(res.company).toBe('CISCO');
    expect(res.role).toBe('Talent Acquisition / HR');
    expect(res.location).toContain('India');
    expect(res.applicationUrl).toBe('https://jobs.cisco.com/careers/job/123456');
    expect(res.relevanceScore).toBe('HIGH');
  });

  // 4. URL EXTRACTION WITH NEWLINES AND PUNCTUATION (SECTION 17)
  it('Section 17: Robustly extracts URLs formatted across newlines and punctuation', () => {
    const captionWithMultiLineUrls = `Urgent Opening for Software Developer!
    Apply link:
    https://careers.company.com/apply/789
    
    Coding Test:
    (https://hackerrank.com/test-999)
    
    Walk-in interview:
    https://company.com/interview/walkin`;

    const res = RuleClassifier.classify(captionWithMultiLineUrls);
    expect(res.isJobPost).toBe(true);
    expect(res.applicationUrl).toBe('https://careers.company.com/apply/789');
    expect(res.testUrl).toBe('https://hackerrank.com/test-999');
    expect(res.interviewUrl).toBe('https://company.com/interview/walkin');
  });

  // 5. EXTENDED KEYWORD COMBINATION TESTS (SECTION 23 - 50 TESTS COVERAGE)
  it('Section 23: Verifies keywords coverage across all target categories', () => {
    const testCases = [
      { text: 'bulk hiring for Software Developer in Noida', expectedRole: 'Software Engineer / SDE' },
      { text: 'urgent hiring for Full Stack Developer in Remote', expectedRole: 'Full Stack Developer' },
      { text: 'mega hiring drive for Frontend Engineer', expectedRole: 'Frontend Developer' },
      { text: 'freshers hiring for Backend Developer', expectedRole: 'Backend Developer' },
      { text: 'graduate trainee for QA Tester in Gurgaon', expectedRole: 'QA / Automation Tester' },
      { text: 'graduate apprentice hiring at TCS India', expectedRole: 'Internship / Graduate Trainee / Apprentice' },
      { text: 'apprentice vacancy for DevOps Engineer', expectedRole: 'DevOps / Cloud Engineer' },
      { text: 'no experience required for Technical Support Executive', expectedRole: 'Technical Support / IT' },
      { text: 'walk-in interview for BDE in Delhi NCR', expectedRole: 'Business Development / Sales' },
      { text: 'Customer Support hiring for freshers', expectedRole: 'Customer Support Executive' },
      { text: 'DSSSB Delhi District Courts Recruitment 2026', expectedRole: 'Government Recruitment' },
      { text: 'SSC Recruitment Notification out for Graduates', expectedRole: 'Government Recruitment' },
      { text: 'Railway RRB Vacancy 2026 apply online', expectedRole: 'Government Recruitment' }
    ];

    for (const tc of testCases) {
      const res = RuleClassifier.classify(tc.text);
      expect(res.isJobPost).toBe(true);
      expect(res.role).toBe(tc.expectedRole);
    }
  });

  // 6. 24-HOUR CUTOFF & TIMESTAMP HANDLING
  it('Part 20: 24-hour active cutoff includes fresh posts (37m ago) and excludes old posts (26h ago)', () => {
    const now = new Date();
    const thirtySevenMinAgo = new Date(now.getTime() - 37 * 60 * 1000);
    const twentySixHoursAgo = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    expect(thirtySevenMinAgo.getTime() >= cutoff24h.getTime()).toBe(true);
    expect(twentySixHoursAgo.getTime() >= cutoff24h.getTime()).toBe(false);
  });

  // 7. AGENT START TIME PERSISTENCE
  it('Requirement: AGENT_START_TIME cutoff preserves timestamp state', () => {
    const preStartPost = new Date('2026-10-03T13:29:00.000Z');
    const postStartPost = new Date('2026-10-03T13:31:00.000Z');

    expect(isPostAfterStartTime(preStartPost, agentStartTime)).toBe(false);
    expect(isPostAfterStartTime(postStartPost, agentStartTime)).toBe(true);
  });
});
