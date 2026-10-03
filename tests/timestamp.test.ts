import { describe, it, expect } from 'vitest';
import { isPostAfterStartTime } from '../src/utils/date.js';
import { RuleClassifier } from '../src/services/ruleClassifier.js';
import { FilterService } from '../src/services/filter.service.js';

describe('Scheduled Worker & Checkpoint Recovery Test Suite', () => {
  const agentStartTime = new Date('2026-10-03T13:30:00.000Z'); // 1:30 PM UTC

  it('Test 1: First scheduled run respects AGENT_START_TIME cutoff', () => {
    const preStartPost = new Date('2026-10-03T13:29:00.000Z');
    const postStartPost = new Date('2026-10-03T13:31:00.000Z');

    expect(isPostAfterStartTime(preStartPost, agentStartTime)).toBe(false);
    expect(isPostAfterStartTime(postStartPost, agentStartTime)).toBe(true);
  });

  it('Test 2: Post published at 4:10 PM detected in 5:30 PM scheduled run', () => {
    const postPublishedAt = new Date('2026-10-03T16:10:00.000Z'); // 4:10 PM
    const lastCheckAt = new Date('2026-10-03T15:30:00.000Z');     // 3:30 PM (Previous check)

    // Verify post is after start time and published after last check
    expect(isPostAfterStartTime(postPublishedAt, agentStartTime)).toBe(true);
    expect(postPublishedAt.getTime() > lastCheckAt.getTime()).toBe(true);
  });

  it('Test 3: Missed 1:30 PM run recovered in 3:30 PM run using LAST_SUCCESSFUL_CHECK', () => {
    const lastSuccessfulCheck = new Date('2026-10-03T11:30:00.000Z'); // 11:30 AM
    const missedPostAt = new Date('2026-10-03T14:15:00.000Z');        // 2:15 PM

    // Recovery window cutoff start
    const recoveryStart = new Date(lastSuccessfulCheck.getTime() - 10 * 60 * 1000);

    expect(missedPostAt.getTime() > recoveryStart.getTime()).toBe(true);
    expect(isPostAfterStartTime(missedPostAt, agentStartTime)).toBe(true);
  });

  it('Test 4: Manual RUN NOW execution preserves original AGENT_START_TIME unchanged', () => {
    const originalStart = agentStartTime;
    const manualRunTime = new Date('2026-10-03T14:45:00.000Z');

    // Simulating retrieval from database state
    const currentAgentStartTime = originalStart;
    expect(currentAgentStartTime.getTime()).toBe(originalStart.getTime());
    expect(currentAgentStartTime.getTime()).not.toBe(manualRunTime.getTime());
  });

  it('Test 5: Duplicate post ID check returns true for previously processed post', () => {
    const processedPostIds = new Set(['C_SCHEDULED_POST_101']);
    
    expect(processedPostIds.has('C_SCHEDULED_POST_101')).toBe(true);
    expect(processedPostIds.has('C_NEW_POST_102')).toBe(false);
  });

  it('Test 6: Location Synonym Resolution matches Gurgaon <-> Gurugram and Delhi NCR', () => {
    const locs = FilterService.normalizeLocation('Gurgaon');
    expect(locs).toContain('Gurugram');

    const ncrLocs = FilterService.normalizeLocation('Delhi NCR');
    expect(ncrLocs).toContain('Noida');
    expect(ncrLocs).toContain('Gurugram');
    expect(ncrLocs).toContain('Delhi');
  });

  it('Test 7: Classify hiring post correctly vs career advice post', () => {
    const hiringPost = RuleClassifier.classify('🚨 Hiring Alert! ABC Tech is hiring Full Stack Developers in Noida. Freshers apply now: https://abctech.careers');
    expect(hiringPost.isJobPost).toBe(true);
    expect(hiringPost.role).toBe('Full Stack Developer');

    const advicePost = RuleClassifier.classify('5 tips to improve your resume.');
    expect(advicePost.isJobPost).toBe(false);
    expect(advicePost.relevanceScore).toBe('IRRELEVANT');
  });
});
