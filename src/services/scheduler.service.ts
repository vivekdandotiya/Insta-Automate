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
  sourcesConfigured: number;
  sourcesChecked: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  sourcesRateLimited?: number;
  sourcesTimedOut?: number;
  postsChecked: number;
  reelsChecked: number;
  postsFetched: number;
  reelsFetched: number;
  candidatesFound: number;
  relevantJobs: number;
  highJobs: number;
  mediumJobs: number;
  lowJobs: number;
  newJobs: number;
  duplicates: number;
  ignored: number;
  expired: number;
  rateLimited: boolean;
  errors: number;
  accountsFailed: number;
  durationMs: number;
  duration?: number;
  status: 'completed' | 'partial' | 'failed' | 'running';
  message?: string;
}

export class SchedulerService {
  public static isRunning: boolean = false;
  private static timerId: NodeJS.Timeout | null = null;
  public static lastScanResult: ScanCycleResult | null = null;

  public static currentAccount: string = '';
  public static currentIndex: number = 0;
  public static totalSources: number = 73;
  public static sourcesSucceeded: number = 0;
  public static sourcesFailed: number = 0;
  public static sourcesRateLimited: number = 0;
  public static sourcesTimedOut: number = 0;
  public static totalPostsChecked: number = 0;
  public static totalReelsChecked: number = 0;
  public static totalJobsFound: number = 0;
  public static newJobsFound: number = 0;
  public static duplicatesFound: number = 0;
  public static elapsedSeconds: number = 0;
  public static statusMessage: string = '';

  public static getScanStatus() {
    const isScanning = SchedulerService.isRunning;
    const currentStatus = isScanning 
      ? 'RUNNING' 
      : (SchedulerService.lastScanResult?.status?.toUpperCase() || 'READY');

    return {
      isScanning,
      status: currentStatus,
      currentAccount: SchedulerService.currentAccount,
      currentIndex: SchedulerService.currentIndex,
      totalSources: SchedulerService.totalSources,
      sourcesSucceeded: SchedulerService.sourcesSucceeded,
      sourcesFailed: SchedulerService.sourcesFailed,
      sourcesRateLimited: SchedulerService.sourcesRateLimited,
      sourcesTimedOut: SchedulerService.sourcesTimedOut,
      postsChecked: SchedulerService.totalPostsChecked,
      reelsChecked: SchedulerService.totalReelsChecked,
      jobsFound: SchedulerService.totalJobsFound,
      newJobs: SchedulerService.newJobsFound,
      duplicates: SchedulerService.duplicatesFound,
      elapsedSeconds: SchedulerService.elapsedSeconds,
      rateLimited: (SchedulerService.sourcesRateLimited > 0),
      message: SchedulerService.statusMessage || (isScanning ? 'Scanning Instagram accounts...' : 'Scan idle'),
      progress: {
        currentAccount: SchedulerService.currentAccount,
        currentIndex: SchedulerService.currentIndex,
        totalSources: SchedulerService.totalSources,
        sourcesSucceeded: SchedulerService.sourcesSucceeded,
        sourcesFailed: SchedulerService.sourcesFailed,
        sourcesRateLimited: SchedulerService.sourcesRateLimited,
        sourcesTimedOut: SchedulerService.sourcesTimedOut,
        postsChecked: SchedulerService.totalPostsChecked,
        reelsChecked: SchedulerService.totalReelsChecked,
        jobsFound: SchedulerService.totalJobsFound,
        newJobs: SchedulerService.newJobsFound,
        duplicates: SchedulerService.duplicatesFound,
        elapsedSeconds: SchedulerService.elapsedSeconds,
        rateLimited: (SchedulerService.sourcesRateLimited > 0),
        message: SchedulerService.statusMessage
      },
      lastScanResult: SchedulerService.lastScanResult
    };
  }

  public static async runInstagramHealthCheck(testAccount: string = 'karrar_hussain_jobs') {
    const adapter = getInstagramAdapter();
    if (typeof (adapter as any).runHealthCheck === 'function') {
      return (adapter as any).runHealthCheck(testAccount);
    }
    return {
      instagramReachable: false,
      profileLookup: 'ERROR',
      posts: 'ERROR',
      reels: 'ERROR',
      statusCode: 500,
      instaloaderVersion: '4.15.3',
      environment: process.env.NODE_ENV || 'production',
      sessionConfigured: Boolean(process.env.INSTAGRAM_SESSION_ID || process.env.INSTAGRAM_SESSION_COOKIE),
      error: 'Health check method not supported on active adapter'
    };
  }

  /**
   * Main single-cycle manual/on-demand execution for Instagram job scans.
   */
  public static async executeCheckCycle(): Promise<ScanCycleResult> {
    if (SchedulerService.isRunning) {
      logger.warn('[SCHEDULER] Scan cycle already in progress. Skipping duplicate execution.');
      return SchedulerService.lastScanResult || {
        sourcesConfigured: 73,
        sourcesChecked: 0,
        sourcesSucceeded: 0,
        sourcesFailed: 0,
        sourcesRateLimited: 0,
        sourcesTimedOut: 0,
        postsChecked: 0,
        reelsChecked: 0,
        postsFetched: 0,
        reelsFetched: 0,
        candidatesFound: 0,
        relevantJobs: 0,
        highJobs: 0,
        mediumJobs: 0,
        lowJobs: 0,
        newJobs: 0,
        duplicates: 0,
        ignored: 0,
        expired: 0,
        errors: 0,
        accountsFailed: 0,
        rateLimited: false,
        durationMs: 0,
        duration: 0,
        status: 'running',
        message: 'Scan already in progress'
      };
    }

    SchedulerService.isRunning = true;
    SchedulerService.currentIndex = 0;
    SchedulerService.currentAccount = '';
    SchedulerService.sourcesSucceeded = 0;
    SchedulerService.sourcesFailed = 0;
    SchedulerService.sourcesRateLimited = 0;
    SchedulerService.sourcesTimedOut = 0;
    SchedulerService.totalPostsChecked = 0;
    SchedulerService.totalReelsChecked = 0;
    SchedulerService.totalJobsFound = 0;
    SchedulerService.newJobsFound = 0;
    SchedulerService.duplicatesFound = 0;
    SchedulerService.elapsedSeconds = 0;
    SchedulerService.statusMessage = 'Starting background scan...';

    const startTimeMs = Date.now();
    const elapsedTimer = setInterval(() => {
      SchedulerService.elapsedSeconds = Math.floor((Date.now() - startTimeMs) / 1000);
    }, 1000);

    let scanned = 0;
    let processed = 0;
    let duplicates = 0;
    let ignoredOld = 0;
    let irrelevant = 0;
    let errors = 0;
    let dbInsertSuccessCount = 0;
    let dbInsertFailureCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    try {
      // 1. Get/Initialize AGENT_START_TIME state (Preserved across runs)
      const agentState = await AgentStateService.getOrCreateAgentState();

      if (agentState.status === 'STOPPED') {
        logger.info(`[SCHEDULER] Agent status is STOPPED. Execution skipped.`);
        const res: ScanCycleResult = {
          sourcesConfigured: 73,
          sourcesChecked: 0,
          sourcesSucceeded: 0,
          sourcesFailed: 0,
          sourcesRateLimited: 0,
          sourcesTimedOut: 0,
          postsChecked: 0,
          reelsChecked: 0,
          postsFetched: 0,
          reelsFetched: 0,
          candidatesFound: 0,
          relevantJobs: 0,
          highJobs: 0,
          mediumJobs: 0,
          lowJobs: 0,
          newJobs: 0,
          duplicates: 0,
          ignored: 0,
          expired: 0,
          errors: 0,
          accountsFailed: 0,
          rateLimited: false,
          durationMs: Date.now() - startTimeMs,
          duration: Date.now() - startTimeMs,
          status: 'failed',
          message: 'Agent status is STOPPED'
        };
        SchedulerService.lastScanResult = res;
        return res;
      }

      const now = new Date();
      const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      logger.info(`[JOB SEARCH ENGINE] Booting manual scan cycle.`);
      logger.info(`[JOB SEARCH ENGINE] NOW UTC: ${now.toISOString()} | IST: ${formatIST(now)}`);
      logger.info(`[JOB SEARCH ENGINE] 24-Hour Active Cutoff UTC: ${cutoff24h.toISOString()} | IST: ${formatIST(cutoff24h)}`);

      // 2. Pre-Scan Health Check (Section 20 requirement)
      const adapter = getInstagramAdapter();
      if (typeof (adapter as any).runHealthCheck === 'function') {
        SchedulerService.statusMessage = 'Performing Instagram connectivity health check...';
        const healthCheck = await (adapter as any).runHealthCheck('karrar_hussain_jobs');
        logger.info(`[PRE-SCAN HEALTH CHECK] Outcome: profileLookup=${healthCheck.profileLookup}, reachable=${healthCheck.instagramReachable}`);

        if (healthCheck.profileLookup === 'RATE_LIMITED' || healthCheck.profileLookup === 'FORBIDDEN') {
          const failMsg = `Instagram access rate-limited (HTTP ${healthCheck.statusCode}). Configure INSTAGRAM_SESSION_ID in environment settings for authenticated scraping.`;
          logger.warn(`[PRE-SCAN HEALTH CHECK FAILED] ${failMsg}`);
          
          SchedulerService.statusMessage = failMsg;
          SchedulerService.sourcesRateLimited = 1;

          const durationMs = Date.now() - startTimeMs;
          const healthFailRes: ScanCycleResult = {
            sourcesConfigured: 73,
            sourcesChecked: 1,
            sourcesSucceeded: 0,
            sourcesFailed: 0,
            sourcesRateLimited: 1,
            sourcesTimedOut: 0,
            postsChecked: 0,
            reelsChecked: 0,
            postsFetched: 0,
            reelsFetched: 0,
            candidatesFound: 0,
            relevantJobs: 0,
            highJobs: 0,
            mediumJobs: 0,
            lowJobs: 0,
            newJobs: 0,
            duplicates: 0,
            ignored: 0,
            expired: 0,
            errors: 1,
            accountsFailed: 1,
            rateLimited: true,
            durationMs,
            duration: durationMs,
            status: 'failed',
            message: failMsg
          };

          SchedulerService.lastScanResult = healthFailRes;
          return healthFailRes;
        }
      }

      // 3. Synchronize and load active Instagram sources
      await SourceService.syncMonitoredSources();
      const activeSources = await prisma.instagramSource.findMany({ where: { enabled: true } });
      const sourcesConfigured = activeSources.length || 73;
      SchedulerService.totalSources = sourcesConfigured;

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
          SchedulerService.currentAccount = source.username;
          SchedulerService.currentIndex++;
          logger.info(`[SCAN] ${source.username}`);

          try {
            const singlePosts = await adapter.fetchLatestPosts(source.username);
            fetchedPosts.push(...singlePosts);
            SchedulerService.sourcesSucceeded++;
          } catch (fetchErr: any) {
            logger.error(`[ACCOUNT FAILED] ${source.username} reason=${fetchErr.message}`);
            SchedulerService.sourcesFailed++;
            errors++;
          }
        }
      }

      // Process fetched posts
      for (const post of fetchedPosts) {
        scanned++;
        if (post.postType === 'REEL') SchedulerService.totalReelsChecked++;
        else SchedulerService.totalPostsChecked++;

        const pubTime = post.publishedAt || new Date();
        const ageHours = (now.getTime() - pubTime.getTime()) / (1000 * 60 * 60);

        logger.info(`[CANDIDATE CHECK] ID: ${post.id} | Account: ${post.sourceAccount} | Type: ${post.postType} | Published UTC: ${pubTime.toISOString()} | Age: ${ageHours.toFixed(2)}h`);

        // 4. 24-Hour Cutoff & AGENT_START_TIME Rule
        if (pubTime.getTime() < cutoff24h.getTime() || !isPostAfterStartTime(pubTime, agentState.agent_start_time)) {
          ignoredOld++;
          logger.info(`[JOB SEARCH ENGINE] IGNORED (Older than 24h or pre-start): Post ${post.id} published ${formatIST(pubTime)} (Age: ${ageHours.toFixed(2)}h)`);
          continue;
        }

        // 5. Primary Duplicate Protection (Instagram Post ID)
        const existingPost = await prisma.processedPost.findUnique({
          where: { instagram_post_id: post.id }
        });

        if (existingPost) {
          duplicates++;
          SchedulerService.duplicatesFound = duplicates;
          logger.info(`[JOB SEARCH ENGINE] DUPLICATE IGNORED: Post ${post.id} already exists in database.`);
          continue;
        }

        const contentHash = crypto.createHash('md5').update(`${post.caption}_${pubTime.getTime()}`).digest('hex');

        // 6. Classification & Relevance Extraction
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

        if (isQualifyingJob) {
          SchedulerService.totalJobsFound++;
          if (jobResult.relevanceScore === 'HIGH') highCount++;
          else if (jobResult.relevanceScore === 'MEDIUM') mediumCount++;
          else lowCount++;
        } else {
          irrelevant++;
        }

        processed++;
        SchedulerService.newJobsFound = processed - irrelevant;
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
            SchedulerService.duplicatesFound = duplicates;
            logger.info(`[JOB SEARCH ENGINE] Race condition duplicate caught for post ${post.id}`);
            continue;
          }
          dbInsertFailureCount++;
          logger.error(`[DB ERROR] Failed to create ProcessedPost record for ${post.id}: ${dbErr.message}`);
          throw dbErr;
        }

        // Create JobAlert database record if qualifying job post
        if (isQualifyingJob) {
          logger.info(`[JOB CANDIDATE]\nusername=${post.sourceAccount}\nmediaType=${post.postType}\nshortcode=${post.id}\npublishedAt=${formatIST(pubTime)}\ntitle=${jobResult.role}\ncompany=${jobResult.company}\nlocation=${jobResult.location}\nrelevance=${jobResult.relevanceScore}\nrelevanceReason=${jobResult.relevanceReason || 'Matched Keywords'}\napplicationUrl=${jobResult.applicationUrl || 'none'}\ntestUrl=${jobResult.testUrl || 'none'}\ninterviewUrl=${jobResult.interviewUrl || 'none'}`);

          try {
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
                application_url: jobResult.applicationUrl || null,
                interview_url: jobResult.interviewUrl || null,
                test_url: jobResult.testUrl || null,
                external_url: jobResult.externalUrl || null,
                relevance_reason: jobResult.relevanceReason || null,
                contact_information: jobResult.contactInformation,
                reason: filterEvaluation.reason,
                notification_sent: false,
                notification_sent_at: null,
                email_sent: false,
                email_sent_at: null
              }
            });

            dbInsertSuccessCount++;
            logger.info(`[DB INSERT SUCCESS] JobAlert created for post ${post.id} (${jobResult.role} at ${jobResult.company})`);
          } catch (dbAlertErr: any) {
            dbInsertFailureCount++;
            logger.error(`[DB ERROR] Failed to create JobAlert record for ${post.id}: ${dbAlertErr.message}`);
          }
        }
      }

      // Update source check time for active sources
      const checkTime = new Date();
      await prisma.instagramSource.updateMany({
        where: { enabled: true },
        data: {
          last_checked_at: checkTime,
          last_status: (adapter as any).rateLimited ? 'RATE_LIMITED' : 'ACTIVE'
        }
      });

      // Save Successful Checkpoint Timestamp
      await AgentStateService.updateLastSuccessfulCheck(new Date());

      const durationMs = Date.now() - startTimeMs;
      const sourcesChecked = (adapter as any).sourcesChecked || 0;
      const sourcesSucceeded = (adapter as any).sourcesSucceeded ?? (sourcesChecked > 0 ? sourcesChecked : 0);
      const sourcesFailed = (adapter as any).sourcesFailed ?? 0;
      const sourcesRateLimited = (adapter as any).sourcesRateLimited ?? 0;
      const sourcesTimedOut = (adapter as any).sourcesTimedOut ?? 0;
      const rateLimited = (adapter as any).rateLimited || false;
      const adapterErrors = (adapter as any).errorsCount || 0;

      const profileLookup429 = (adapter as any).profileLookup429 || 0;
      const profileLookup403 = (adapter as any).profileLookup403 || 0;
      const profileLookupOtherError = (adapter as any).profileLookupOtherError || 0;

      // Determine explicit status
      let finalStatus: 'completed' | 'partial' | 'failed' = 'completed';
      let statusMessage = `Scan completed (${sourcesSucceeded}/${sourcesConfigured} sources checked)`;

      if (sourcesChecked === 0 || sourcesSucceeded === 0) {
        finalStatus = 'failed';
        statusMessage = (sourcesRateLimited > 0 || rateLimited) 
          ? `Scan failed: 0/${sourcesConfigured} sources checked (Instagram rate limited)`
          : `Scan failed: 0/${sourcesConfigured} sources checked (Data connection failed)`;
      } else if (sourcesChecked < sourcesConfigured || sourcesRateLimited > 0 || sourcesFailed > 0 || sourcesTimedOut > 0) {
        finalStatus = 'partial';
        statusMessage = `Scan partial: ${sourcesSucceeded}/${sourcesConfigured} sources checked (${sourcesRateLimited} rate-limited, ${sourcesTimedOut} timed out, ${sourcesFailed} failed)`;
      }

      SchedulerService.statusMessage = statusMessage;

      // Count total jobs currently in API DB
      const apiJobsCount = await prisma.processedPost.count({ where: { classification: 'JOB_POST' } });

      logger.info(`
==================== PIPELINE STAGE SUMMARY ====================
INSTAGRAM ACCOUNTS REQUESTED: ${sourcesConfigured}
PROFILE LOOKUPS:              ${sourcesChecked}
PROFILE LOOKUP SUCCESS:       ${sourcesSucceeded}
PROFILE LOOKUP 429:           ${profileLookup429}
PROFILE LOOKUP 403:           ${profileLookup403}
PROFILE LOOKUP OTHER ERROR:   ${profileLookupOtherError}
POSTS FETCHED:                ${SchedulerService.totalPostsChecked}
REELS FETCHED:                ${SchedulerService.totalReelsChecked}
JOB CANDIDATES:               ${scanned}
CLASSIFIED RELEVANT:          ${highCount + mediumCount + lowCount}
DB INSERT SUCCESS:            ${dbInsertSuccessCount}
DB INSERT FAILURE:            ${dbInsertFailureCount}
API JOBS:                     ${apiJobsCount}
DASHBOARD JOBS:               ${apiJobsCount}
DURATION:                     ${(durationMs / 1000).toFixed(1)}s
STATUS:                       ${finalStatus} (${statusMessage})
================================================================`);

      const resultPayload: ScanCycleResult = {
        sourcesConfigured,
        sourcesChecked,
        sourcesSucceeded,
        sourcesFailed,
        sourcesRateLimited,
        sourcesTimedOut,
        postsChecked: SchedulerService.totalPostsChecked,
        reelsChecked: SchedulerService.totalReelsChecked,
        postsFetched: scanned,
        reelsFetched: SchedulerService.totalReelsChecked,
        candidatesFound: scanned,
        relevantJobs: highCount + mediumCount + lowCount,
        highJobs: highCount,
        mediumJobs: mediumCount,
        lowJobs: lowCount,
        newJobs: processed - irrelevant,
        duplicates,
        ignored: ignoredOld + irrelevant,
        expired: ignoredOld,
        rateLimited,
        errors: errors + adapterErrors,
        accountsFailed: sourcesFailed,
        durationMs,
        duration: durationMs,
        status: finalStatus,
        message: statusMessage
      };

      SchedulerService.lastScanResult = resultPayload;
      return resultPayload;

    } catch (err: any) {
      logger.error(`[JOB SEARCH ENGINE] Fatal error in scan cycle: ${err.message}`);
      await AgentStateService.setStatus('ERROR', err.message);
      const errRes: ScanCycleResult = {
        sourcesConfigured: 73,
        sourcesChecked: 0,
        sourcesSucceeded: 0,
        sourcesFailed: 73,
        sourcesRateLimited: 0,
        sourcesTimedOut: 0,
        postsChecked: 0,
        reelsChecked: 0,
        postsFetched: 0,
        reelsFetched: 0,
        candidatesFound: 0,
        relevantJobs: 0,
        highJobs: 0,
        mediumJobs: 0,
        lowJobs: 0,
        newJobs: 0,
        duplicates: 0,
        ignored: 0,
        expired: 0,
        errors: errors + 1,
        accountsFailed: 73,
        rateLimited: false,
        durationMs: Date.now() - startTimeMs,
        duration: Date.now() - startTimeMs,
        status: 'failed',
        message: `Fatal error during scan: ${err.message}`
      };
      SchedulerService.lastScanResult = errRes;
      return errRes;
    } finally {
      clearInterval(elapsedTimer);
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
