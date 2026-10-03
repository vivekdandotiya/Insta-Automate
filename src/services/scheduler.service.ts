import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { formatIST, isPostAfterStartTime } from '../utils/date.js';
import { AgentStateService } from './agentState.service.js';
import { getInstagramAdapter } from './instagram/factory.js';
import { ClassifierService } from './classifier.service.js';
import { FilterService } from './filter.service.js';
import { TelegramService } from './telegram.service.js';

export class SchedulerService {
  private static isRunning: boolean = false;
  private static timerId: NodeJS.Timeout | null = null;

  /**
   * Main single-cycle execution for Scheduled Cron Workers and Manual Run Now requests.
   */
  public static async executeCheckCycle(): Promise<{ 
    scanned: number; 
    processed: number; 
    notified: number; 
    duplicates: number;
    errors: number;
    durationMs: number;
  }> {
    if (SchedulerService.isRunning) {
      logger.warn('[SCHEDULER] Scan cycle already in progress. Skipping duplicate execution.');
      return { scanned: 0, processed: 0, notified: 0, duplicates: 0, errors: 0, durationMs: 0 };
    }

    SchedulerService.isRunning = true;
    const startTimeMs = Date.now();
    let scanned = 0;
    let processed = 0;
    let notified = 0;
    let duplicates = 0;
    let errors = 0;

    try {
      // 1. Get/Initialize AGENT_START_TIME state (Requirements 3, 4, 5)
      const agentState = await AgentStateService.getOrCreateAgentState();

      if (agentState.status === 'STOPPED') {
        logger.info(`[SCHEDULER] Agent status is STOPPED. Execution skipped.`);
        SchedulerService.isRunning = false;
        return { scanned, processed, notified, duplicates, errors, durationMs: Date.now() - startTimeMs };
      }

      logger.info(`[SCHEDULED WORKER] Booting execution cycle.`);
      logger.info(`[SCHEDULED WORKER] AGENT_START_TIME Cutoff: ${formatIST(agentState.agent_start_time)}`);
      logger.info(`[SCHEDULED WORKER] LAST_SUCCESSFUL_CHECK: ${agentState.last_successful_check ? formatIST(agentState.last_successful_check) : 'None (First Run)'}`);

      // Calculate Downtime Recovery Cutoff Window
      const recoveryCutoff = agentState.last_successful_check
        ? new Date(agentState.last_successful_check.getTime() - 10 * 60 * 1000)
        : agentState.agent_start_time;

      logger.info(`[SCHEDULED WORKER] Effective Recovery Cutoff: ${formatIST(recoveryCutoff)}`);

      // 2. Load active Instagram sources (Requirement 9)
      let activeSources = await prisma.instagramSource.findMany({ where: { enabled: true } });

      if (activeSources.length === 0) {
        logger.info('[SCHEDULED WORKER] Seeding default Instagram source @tech_jobs_india');
        await prisma.instagramSource.create({
          data: {
            username: '@tech_jobs_india',
            profile_url: 'https://www.instagram.com/tech_jobs_india/',
            priority: 'HIGH'
          }
        });
        activeSources = await prisma.instagramSource.findMany({ where: { enabled: true } });
      }

      const adapter = getInstagramAdapter();

      for (const source of activeSources) {
        logger.info(`[SCHEDULED WORKER] Fetching feed for source: ${source.username}`);
        let posts = [];

        try {
          posts = await adapter.fetchLatestPosts(source.username);
        } catch (fetchErr: any) {
          logger.error(`[SCHEDULED WORKER] Failed to fetch posts from ${source.username}: ${fetchErr.message}`);
          errors++;
          continue;
        }

        for (const post of posts) {
          scanned++;

          // 3. Strict Timestamp Cutoff Rule: published_at > AGENT_START_TIME
          if (!isPostAfterStartTime(post.publishedAt, agentState.agent_start_time)) {
            logger.info(`[SCHEDULED WORKER] IGNORED (Pre-Start): Post ${post.id} published (${formatIST(post.publishedAt)}) <= AGENT_START_TIME (${formatIST(agentState.agent_start_time)})`);
            continue;
          }

          // Recovery Window Check
          if (post.publishedAt.getTime() <= recoveryCutoff.getTime() && agentState.last_successful_check) {
            logger.info(`[SCHEDULED WORKER] IGNORED (Within Previous Checkpoint): Post ${post.id} published (${formatIST(post.publishedAt)}) <= Recovery Cutoff (${formatIST(recoveryCutoff)})`);
            continue;
          }

          // 4. Unique DB Deduplication Lock (Requirement 7)
          const existingPost = await prisma.processedPost.findUnique({
            where: { instagram_post_id: post.id }
          });

          if (existingPost) {
            duplicates++;
            logger.info(`[SCHEDULED WORKER] DUPLICATE IGNORED: Post ${post.id} already exists in database.`);
            continue;
          }

          const contentHash = crypto.createHash('md5').update(`${post.caption}_${post.publishedAt.getTime()}`).digest('hex');

          // 5. Classification & Extraction
          let jobResult;
          try {
            jobResult = await ClassifierService.processContent(post.caption, post.mediaUrls);
          } catch (classErr: any) {
            logger.error(`[SCHEDULED WORKER] Classification error for post ${post.id}: ${classErr.message}`);
            errors++;
            continue;
          }

          processed++;
          const detectedAt = new Date();

          // Save ProcessedPost record with atomic uniqueness protection
          let processedRecord;
          try {
            processedRecord = await prisma.processedPost.create({
              data: {
                instagram_post_id: post.id,
                source_account: source.username,
                post_url: post.postUrl,
                post_type: post.postType,
                published_at: post.publishedAt,
                detected_at: detectedAt,
                processed_at: new Date(),
                classification: jobResult.isJobPost ? 'JOB_POST' : 'NOT_JOB_POST',
                relevance_score: jobResult.relevanceScore,
                confidence: jobResult.confidence,
                content_hash: contentHash,
                processing_status: 'PROCESSED'
              }
            });
          } catch (dbErr: any) {
            if (dbErr.code === 'P2002') {
              duplicates++;
              logger.info(`[SCHEDULED WORKER] Race condition duplicate caught for post ${post.id}`);
              continue;
            }
            throw dbErr;
          }

          // 6. User Preference Filter
          const filterEvaluation = await FilterService.isMatch(jobResult);

          if (jobResult.isJobPost && filterEvaluation.matches) {
            // 7. Send Telegram Alert
            const sentSuccess = await TelegramService.sendAlert({
              company: jobResult.company,
              role: jobResult.role,
              location: jobResult.location,
              experience: jobResult.experience,
              salary: jobResult.salary,
              workMode: jobResult.workMode,
              employmentType: jobResult.employmentType,
              publishedAt: post.publishedAt,
              detectedAt,
              relevanceScore: jobResult.relevanceScore,
              sourceAccount: source.username,
              postUrl: post.postUrl,
              applicationLink: jobResult.applicationLink
            });

            if (sentSuccess) notified++;

            // Create JobAlert record
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
                notification_sent: sentSuccess,
                notification_sent_at: sentSuccess ? new Date() : null
              }
            });
          }
        }

        // Update source check time
        await prisma.instagramSource.update({
          where: { id: source.id },
          data: { last_checked_at: new Date() }
        });
      }

      // 8. Save Successful Checkpoint Timestamp (Requirement 6 & Section 5)
      await AgentStateService.updateLastSuccessfulCheck(new Date());

      const durationMs = Date.now() - startTimeMs;
      logger.info(`[SCHEDULED WORKER] Cycle complete in ${durationMs}ms. Scanned: ${scanned}, Processed: ${processed}, Notified: ${notified}, Duplicates: ${duplicates}, Errors: ${errors}`);

      return { scanned, processed, notified, duplicates, errors, durationMs };

    } catch (err: any) {
      logger.error(`[SCHEDULED WORKER] Fatal error in check cycle: ${err.message}`);
      await AgentStateService.setStatus('ERROR', err.message);
      return { scanned, processed, notified, duplicates, errors: errors + 1, durationMs: Date.now() - startTimeMs };
    } finally {
      SchedulerService.isRunning = false;
    }
  }

  /**
   * Start recurring daemon timer if running locally
   */
  public static startScheduler() {
    if (SchedulerService.timerId) return;

    const intervalMs = config.pollIntervalHours * 3600 * 1000;
    logger.info(`[SCHEDULER] Starting scheduled daemon loop (POLL_INTERVAL_HOURS: ${config.pollIntervalHours}h / ${intervalMs / 1000}s)`);

    // Execute first check cycle
    SchedulerService.executeCheckCycle();

    SchedulerService.timerId = setInterval(() => {
      SchedulerService.executeCheckCycle();
    }, intervalMs);
  }

  /**
   * Stop background loop
   */
  public static stopScheduler() {
    if (SchedulerService.timerId) {
      clearInterval(SchedulerService.timerId);
      SchedulerService.timerId = null;
      logger.info('[SCHEDULER] Scheduled daemon loop stopped');
    }
  }
}
