import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { formatIST, isPostAfterStartTime } from '../utils/date.js';
import { AgentStateService } from './agentState.service.js';
import { SourceService } from './source.service.js';
import { getInstagramAdapter } from './instagram/factory.js';
import { ClassifierService } from './classifier.service.js';
import { FilterService } from './filter.service.js';
import { RawInstagramPost } from './instagram/adapter.interface.js';

export interface ScanCycleResult {
  scanned: number;
  processed: number;
  jobsFound: number;
  duplicates: number;
  ignoredOld: number;
  irrelevant: number;
  errors: number;
  durationMs: number;
  notified?: number;
}

export class SchedulerService {
  private static isRunning: boolean = false;
  private static timerId: NodeJS.Timeout | null = null;

  /**
   * Main single-cycle manual/on-demand execution for Instagram job scans.
   */
  public static async executeCheckCycle(): Promise<ScanCycleResult> {
    if (SchedulerService.isRunning) {
      logger.warn('[SCHEDULER] Scan cycle already in progress. Skipping duplicate execution.');
      return {
        scanned: 0,
        processed: 0,
        jobsFound: 0,
        duplicates: 0,
        ignoredOld: 0,
        irrelevant: 0,
        errors: 0,
        durationMs: 0
      };
    }

    SchedulerService.isRunning = true;
    const startTimeMs = Date.now();
    let scanned = 0;
    let processed = 0;
    let duplicates = 0;
    let ignoredOld = 0;
    let irrelevant = 0;
    let errors = 0;

    try {
      // 1. Get/Initialize AGENT_START_TIME state (Preserved across runs)
      const agentState = await AgentStateService.getOrCreateAgentState();

      if (agentState.status === 'STOPPED') {
        logger.info(`[SCHEDULER] Agent status is STOPPED. Execution skipped.`);
        SchedulerService.isRunning = false;
        return { scanned, processed, jobsFound: 0, duplicates, ignoredOld, irrelevant, errors, durationMs: Date.now() - startTimeMs };
      }

      const now = new Date();
      const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      logger.info(`[JOB SEARCH ENGINE] Booting manual scan cycle.`);
      logger.info(`[JOB SEARCH ENGINE] 24-Hour Active Window Cutoff: ${formatIST(cutoff24h)}`);
      logger.info(`[JOB SEARCH ENGINE] AGENT_START_TIME Cutoff: ${formatIST(agentState.agent_start_time)}`);

      // 2. Synchronize and load active Instagram sources
      await SourceService.syncMonitoredSources();
      const activeSources = await prisma.instagramSource.findMany({ where: { enabled: true } });

      const adapter = getInstagramAdapter();
      let fetchedPosts: RawInstagramPost[] = [];

      if (typeof adapter.fetchBatchPosts === 'function') {
        try {
          fetchedPosts = await adapter.fetchBatchPosts(activeSources.map(s => s.username));
        } catch (batchErr: any) {
          logger.error(`[JOB SEARCH ENGINE] Batch fetch failed: ${batchErr.message}`);
          errors++;
        }
      } else {
        for (const source of activeSources) {
          logger.info(`[JOB SEARCH ENGINE] Fetching feed for source: ${source.username}`);
          try {
            const singlePosts = await adapter.fetchLatestPosts(source.username);
            fetchedPosts.push(...singlePosts);
          } catch (fetchErr: any) {
            logger.error(`[JOB SEARCH ENGINE] Failed to fetch posts from ${source.username}: ${fetchErr.message}`);
            errors++;
          }
        }
      }

      for (const post of fetchedPosts) {
        scanned++;

        const pubTime = post.publishedAt || new Date();

        // 3. 24-Hour Cutoff & AGENT_START_TIME Rule
        if (pubTime.getTime() < cutoff24h.getTime() || !isPostAfterStartTime(pubTime, agentState.agent_start_time)) {
          ignoredOld++;
          logger.info(`[JOB SEARCH ENGINE] IGNORED (Older than 24h or pre-start): Post ${post.id} published ${formatIST(pubTime)}`);
          continue;
        }

        // 4. Primary Duplicate Protection (Instagram Post ID)
        const existingPost = await prisma.processedPost.findUnique({
          where: { instagram_post_id: post.id }
        });

        if (existingPost) {
          duplicates++;
          logger.info(`[JOB SEARCH ENGINE] DUPLICATE IGNORED: Post ${post.id} already exists in database.`);
          continue;
        }

        const contentHash = crypto.createHash('md5').update(`${post.caption}_${pubTime.getTime()}`).digest('hex');

        // 5. Classification & Relevance Extraction
        let jobResult;
        try {
          jobResult = await ClassifierService.processContent(post.caption, post.mediaUrls);
        } catch (classErr: any) {
          logger.error(`[JOB SEARCH ENGINE] Classification error for post ${post.id}: ${classErr.message}`);
          errors++;
          continue;
        }

        const filterEvaluation = await FilterService.isMatch(jobResult);
        const isQualifyingJob = jobResult.isJobPost && filterEvaluation.matches;

        if (!isQualifyingJob) {
          irrelevant++;
        }

        processed++;
        const detectedAt = new Date();
        const expiresAt = new Date(pubTime.getTime() + 24 * 60 * 60 * 1000);

        // Save ProcessedPost record with atomic uniqueness protection
        let processedRecord;
        try {
          processedRecord = await prisma.processedPost.create({
            data: {
              instagram_post_id: post.id,
              source_account: post.sourceAccount,
              post_url: post.postUrl,
              post_type: post.postType,
              published_at: pubTime,
              detected_at: detectedAt,
              processed_at: new Date(),
              classification: jobResult.isJobPost ? 'JOB_POST' : 'NOT_JOB_POST',
              relevance_score: jobResult.relevanceScore,
              confidence: jobResult.confidence,
              content_hash: contentHash,
              processing_status: 'PROCESSED',
              user_status: 'NEW',
              expires_at: expiresAt
            }
          });
        } catch (dbErr: any) {
          if (dbErr.code === 'P2002') {
            duplicates++;
            logger.info(`[JOB SEARCH ENGINE] Race condition duplicate caught for post ${post.id}`);
            continue;
          }
          throw dbErr;
        }

        // Create JobAlert database record if qualifying job post
        if (isQualifyingJob) {
          await prisma.jobAlert.create({
            data: {
              processed_post_id: processedRecord.id,
              company: jobResult.company,
              role: jobResult.role,
              location: jobResult.location,
              experience: jobResult.experience,
              salary: jobResult.salary,
              employment_type: jobResult.employmentType,
              work_mode: jobResult.workMode,
              skills: jobResult.skills,
              education: jobResult.education,
              deadline: jobResult.deadline,
              application_method: jobResult.applicationMethod,
              application_link: jobResult.applicationLink,
              contact_information: jobResult.contactInformation,
              reason: filterEvaluation.reason,
              notification_sent: false,
              notification_sent_at: null,
              email_sent: false,
              email_sent_at: null
            }
          });
        }
      }

      // Update source check time for active sources
      const checkTime = new Date();
      await prisma.instagramSource.updateMany({
        where: { enabled: true },
        data: { last_checked_at: checkTime }
      });

      // 6. Save Successful Checkpoint Timestamp
      await AgentStateService.updateLastSuccessfulCheck(new Date());

      const durationMs = Date.now() - startTimeMs;
      logger.info(`[JOB SEARCH ENGINE] Scan complete in ${durationMs}ms. Scanned: ${scanned}, Jobs Found: ${processed - irrelevant}, Duplicates: ${duplicates}, Ignored Old: ${ignoredOld}, Irrelevant: ${irrelevant}, Errors: ${errors}`);

      return {
        scanned,
        processed,
        jobsFound: processed - irrelevant,
        duplicates,
        ignoredOld,
        irrelevant,
        errors,
        durationMs,
        notified: 0
      };

    } catch (err: any) {
      logger.error(`[JOB SEARCH ENGINE] Fatal error in scan cycle: ${err.message}`);
      await AgentStateService.setStatus('ERROR', err.message);
      return {
        scanned,
        processed,
        jobsFound: 0,
        duplicates,
        ignoredOld,
        irrelevant,
        errors: errors + 1,
        durationMs: Date.now() - startTimeMs,
        notified: 0
      };
    } finally {
      SchedulerService.isRunning = false;
    }
  }

  /**
   * Disabled automatic background loop.
   */
  public static startScheduler() {
    logger.info('[SCHEDULER] Automatic 2-hour cron loop disabled. Scans triggered manually via dashboard.');
  }

  /**
   * Stop background loop if active.
   */
  public static stopScheduler() {
    if (SchedulerService.timerId) {
      clearInterval(SchedulerService.timerId);
      SchedulerService.timerId = null;
      logger.info('[SCHEDULER] Scheduled daemon loop stopped');
    }
  }
}
