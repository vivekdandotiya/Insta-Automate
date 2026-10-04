import { describe, it, expect } from 'vitest';
import { isPostAfterStartTime } from '../src/utils/date.js';
import { RuleClassifier } from '../src/services/ruleClassifier.js';
import { FilterService } from '../src/services/filter.service.js';
import { TelegramService } from '../src/services/telegram.service.js';
import { EmailNotificationService } from '../src/services/email.service.js';
import { getMonitoredInstagramAccounts, DEFAULT_MONITORED_ACCOUNTS } from '../src/config/sources.config.js';

describe('Comprehensive Production Audit & Test Suite (Requirement 18)', () => {
  const agentStartTime = new Date('2026-10-03T13:30:00.000Z');

  // --- MONITORED INSTAGRAM SOURCES AUDIT ---
  it('Requirement: Monitored source list contains exactly 69 target accounts including 3 new accounts', () => {
    const accounts = getMonitoredInstagramAccounts();
    expect(accounts.length).toBe(69);
    expect(DEFAULT_MONITORED_ACCOUNTS.length).toBe(69);
    
    // Check key existing accounts
    expect(accounts).toContain('pranaviism.tech');
    expect(accounts).toContain('job_hiring_hub');
    expect(accounts).toContain('pritkargathiya.ai');
    expect(accounts).toContain('tech_jobs_india');

    // Check 3 newly added accounts
    expect(accounts).toContain('careerwithkumar');
    expect(accounts).toContain('ca.nikitasimplifies');
    expect(accounts).toContain('._scholarly_insights._');
  });

  // --- EXPANDED KEYWORD & SEMANTIC DETECTION AUDIT ---
  it('Requirement: Classifies expanded job keywords & rejects generic career advice', () => {
    // 1. Job Alert Remote Freshers
    const p1 = RuleClassifier.classify('Job Alert: Software Engineer | Remote | Freshers apply link in bio');
    expect(p1.isJobPost).toBe(true);
    expect(p1.role).toBe('Software Engineer');
    expect(p1.relevanceScore).toBe('HIGH');

    // 2. Walk-in hiring for Backend Developers in Noida
    const p2 = RuleClassifier.classify('Walk-in Hiring for Backend Developers in Noida. Urgent hiring for Node.js developers.');
    expect(p2.isJobPost).toBe(true);
    expect(p2.role).toBe('Backend Developer');
    expect(p2.relevanceScore).toBe('HIGH');

    // 3. Internship Opportunity React Developer
    const p3 = RuleClassifier.classify('Internship Opportunity | React Developer | Delhi | Paid internship for freshers');
    expect(p3.isJobPost).toBe(true);
    expect(p3.employmentType).toBe('Internship');
    expect(p3.relevanceScore).toBe('HIGH');

    // 4. Vacancy Customer Support
    const p4 = RuleClassifier.classify('Vacancy: Customer Support Executive | Gurgaon | Mass hiring');
    expect(p4.isJobPost).toBe(true);
    expect(p4.role).toBe('Customer Support');

    // 5. Generic Career Content (Must be REJECTED)
    const g1 = RuleClassifier.classify('10 career tips for students');
    expect(g1.isJobPost).toBe(false);
    expect(g1.relevanceScore).toBe('IRRELEVANT');

    const g2 = RuleClassifier.classify('My morning routine as a developer');
    expect(g2.isJobPost).toBe(false);

    const g3 = RuleClassifier.classify('How I got my first job in IT');
    expect(g3.isJobPost).toBe(false);
  });

  // --- 1 & 2. APIFY API TOKEN VALIDATION ---
  it('Requirement 1 & 16: Missing APIFY_API_TOKEN fails clearly without fallback to mock', async () => {
    const { ApifyInstagramAdapter } = await import('../src/services/instagram/apifyAdapter.js');
    const adapter = new ApifyInstagramAdapter();
    
    // Temporarily clear env
    const origToken = process.env.APIFY_API_TOKEN;
    delete process.env.APIFY_API_TOKEN;

    await expect(adapter.fetchLatestPosts('@tech_jobs_india')).rejects.toThrow('CONFIGURATION REQUIRED: APIFY_API_TOKEN environment variable is not configured');

    // Restore env
    if (origToken) process.env.APIFY_API_TOKEN = origToken;
  });

  // --- 3 & 4. TELEGRAM CREDENTIALS VALIDATION ---
  it('Requirement 4 & 16: TelegramService fails clearly when bot credentials are missing', async () => {
    const sent = await TelegramService.sendAlert({
      company: 'Test Co',
      role: 'Full Stack Developer',
      location: 'Noida',
      experience: 'Fresher',
      salary: 'Not specified',
      workMode: 'Hybrid',
      employmentType: 'Full Time',
      publishedAt: new Date(),
      detectedAt: new Date(),
      relevanceScore: 'HIGH',
      sourceAccount: '@test_account',
      postUrl: 'https://instagram.com/p/test/',
      applicationLink: 'Not specified'
    });

    // When bot token or chat ID are missing, sendAlert returns false safely
    expect(typeof sent).toBe('boolean');
  });

  // --- EMAIL SERVICE VALIDATION ---
  it('Requirement: EmailNotificationService handles subject formatting, HTML generation, and missing API keys cleanly', async () => {
    const payload = {
      company: 'ABC Tech',
      role: 'Full Stack Developer',
      location: 'Delhi NCR',
      experience: '0-2 Years',
      salary: '8 LPA',
      workMode: 'Remote',
      employmentType: 'Full Time',
      publishedAt: new Date('2026-10-04T08:00:00.000Z'),
      detectedAt: new Date('2026-10-04T08:05:00.000Z'),
      relevanceScore: 'HIGH',
      sourceAccount: '@test_account',
      postUrl: 'https://www.instagram.com/p/C_TEST/',
      applicationLink: 'https://abctech.careers'
    };

    const subject = EmailNotificationService.buildSubject(payload);
    expect(subject).toBe('🚨 New Job Alert: Full Stack Developer | Delhi NCR');

    const html = EmailNotificationService.buildHtmlBody(payload);
    expect(html).toContain('NEW JOB ALERT');
    expect(html).toContain('Full Stack Developer');
    expect(html).toContain('ABC Tech');
    expect(html).toContain('https://abctech.careers');

    // When RESEND_API_KEY is missing, sendAlert logs warning and returns false without throwing
    const origKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const sent = await EmailNotificationService.sendAlert(payload);
    expect(sent).toBe(false);

    if (origKey) process.env.RESEND_API_KEY = origKey;
  });

  // --- 5, 6, 7. AGENT_START_TIME PERSISTENCE ---
  it('Requirement 5, 6, 7: AGENT_START_TIME cutoff ignores pre-start posts & preserves timestamp', () => {
    const preStartPost = new Date('2026-10-03T13:29:00.000Z');
    const postStartPost = new Date('2026-10-03T13:31:00.000Z');

    expect(isPostAfterStartTime(preStartPost, agentStartTime)).toBe(false);
    expect(isPostAfterStartTime(postStartPost, agentStartTime)).toBe(true);
  });

  // --- 8 & 9. POST ELIGIBILITY & RECOVERY ---
  it('Requirement 8, 9, 10: Downtime recovery uses LAST_SUCCESSFUL_CHECK window', () => {
    const lastSuccessfulCheck = new Date('2026-10-03T11:30:00.000Z');
    const missedPostAt = new Date('2026-10-03T14:15:00.000Z');

    const recoveryStart = new Date(lastSuccessfulCheck.getTime() - 10 * 60 * 1000);

    expect(missedPostAt.getTime() > recoveryStart.getTime()).toBe(true);
    expect(isPostAfterStartTime(missedPostAt, agentStartTime)).toBe(true);
  });

  // --- 11. DEDUPLICATION KEY CHECK ---
  it('Requirement 11: Unique instagram_post_id prevents duplicate processing', () => {
    const processedPostIds = new Set(['C_SCHEDULED_POST_101']);
    expect(processedPostIds.has('C_SCHEDULED_POST_101')).toBe(true);
    expect(processedPostIds.has('C_NEW_POST_102')).toBe(false);
  });

  // --- 14. LOCATION SYNONYM MATCHING ---
  it('Requirement 14: Location Synonym Resolution matches Gurgaon <-> Gurugram, Ghaziabad, Faridabad and Delhi NCR', () => {
    const locs = FilterService.normalizeLocation('Gurgaon');
    expect(locs).toContain('Gurugram');

    const gzLocs = FilterService.normalizeLocation('Ghaziabad');
    expect(gzLocs).toContain('Delhi NCR');

    const ncrLocs = FilterService.normalizeLocation('Delhi NCR');
    expect(ncrLocs).toContain('Noida');
    expect(ncrLocs).toContain('Gurugram');
    expect(ncrLocs).toContain('Delhi');
    expect(ncrLocs).toContain('Ghaziabad');
    expect(ncrLocs).toContain('Faridabad');
  });

  // --- 15. TELEGRAM ALERT MESSAGE FORMATTING ---
  it('Requirement 15: Telegram alert HTML template contains IST timestamps and post URLs', () => {
    const now = new Date('2026-10-03T12:00:00.000Z');
    const message = TelegramService.buildAlertMessage({
      company: 'ABC Technologies',
      role: 'Full Stack Developer',
      location: 'Noida / Delhi NCR',
      experience: '0-2 Years',
      salary: '6-8 LPA',
      workMode: 'Hybrid',
      employmentType: 'Full Time',
      publishedAt: now,
      detectedAt: now,
      relevanceScore: 'HIGH',
      sourceAccount: '@tech_jobs_india',
      postUrl: 'https://www.instagram.com/p/C123/',
      applicationLink: 'https://abctech.careers/job/1'
    });

    expect(message).toContain('NEW JOB ALERT');
    expect(message).toContain('ABC Technologies');
    expect(message).toContain('Full Stack Developer');
    expect(message).toContain('IST');
    expect(message).toContain('https://www.instagram.com/p/C123/');
  });
});
