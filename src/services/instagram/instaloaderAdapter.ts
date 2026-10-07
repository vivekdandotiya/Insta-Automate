import { execFile } from 'child_process';
import path from 'path';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';
import { SchedulerService } from '../scheduler.service.js';

export class InstaloaderInstagramAdapter implements InstagramAdapter {
  public sourcesChecked: number = 0;
  public sourcesSucceeded: number = 0;
  public sourcesFailed: number = 0;
  public sourcesRateLimited: number = 0;
  public sourcesTimedOut: number = 0;
  public rateLimited: boolean = false;
  public errorsCount: number = 0;

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    return this.fetchBatchPosts([sourceAccount]);
  }

  public async fetchBatchPosts(sourceAccounts: string[]): Promise<RawInstagramPost[]> {
    this.sourcesChecked = 0;
    this.sourcesSucceeded = 0;
    this.sourcesFailed = 0;
    this.sourcesRateLimited = 0;
    this.sourcesTimedOut = 0;
    this.rateLimited = false;
    this.errorsCount = 0;

    const cleanUsernames = sourceAccounts
      .map(a => a.replace('@', '').replace(/\//g, '').trim())
      .filter(Boolean);

    if (cleanUsernames.length === 0) return [];

    logger.info(`[INSTALOADER ADAPTER] Starting safe bounded sequential fetch for ${cleanUsernames.length} public accounts...`);

    const allPosts: RawInstagramPost[] = [];
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'instaloader_fetch.py');
    const startTimeMs = Date.now();
    const MAX_SCAN_DURATION_MINUTES = parseInt(process.env.MAX_SCAN_DURATION_MINUTES || '10', 10);
    const MAX_SCAN_DURATION_MS = MAX_SCAN_DURATION_MINUTES * 60 * 1000;
    const deadline = startTimeMs + MAX_SCAN_DURATION_MS;

    const ACCOUNT_TIMEOUT_MS = parseInt(process.env.INSTAGRAM_ACCOUNT_TIMEOUT_MS || '25000', 10);
    const ACCOUNT_DELAY_MS = parseInt(process.env.INSTAGRAM_ACCOUNT_DELAY_MS || '2000', 10);

    let consecutiveRateLimits = 0;

    for (let i = 0; i < cleanUsernames.length; i++) {
      const username = cleanUsernames[i];
      const nowMs = Date.now();

      // 1. HARD GLOBAL DEADLINE CHECK (10 Minutes)
      if (nowMs >= deadline) {
        logger.warn(`[INSTALOADER ADAPTER] Maximum scan duration of ${MAX_SCAN_DURATION_MINUTES} minutes reached. Stopping further account fetches.`);
        SchedulerService.statusMessage = `Maximum scan duration (${MAX_SCAN_DURATION_MINUTES}:00) reached. Finalizing results...`;
        break;
      }

      SchedulerService.currentAccount = `@${username}`;
      SchedulerService.currentIndex = i + 1;
      SchedulerService.totalSources = cleanUsernames.length;
      SchedulerService.sourcesSucceeded = this.sourcesSucceeded;
      SchedulerService.sourcesFailed = this.sourcesFailed;
      SchedulerService.sourcesRateLimited = this.sourcesRateLimited;
      SchedulerService.sourcesTimedOut = this.sourcesTimedOut;

      const elapsedSec = Math.floor((nowMs - startTimeMs) / 1000);
      const minsStr = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const secsStr = (elapsedSec % 60).toString().padStart(2, '0');
      const timeStr = `${minsStr}:${secsStr}`;

      logger.info(`[SCAN] [${i + 1}/${cleanUsernames.length}] Fetching @${username} (Elapsed: ${timeStr})...`);
      SchedulerService.statusMessage = `Scanning ${i + 1}/${cleanUsernames.length}: @${username} (Elapsed: ${timeStr})`;

      let fetchResult: any = null;
      const backoffDelays = [30000, 60000, 120000]; // 30s, 60s, 120s backoff

      for (let attempt = 1; attempt <= 4; attempt++) {
        // Re-check deadline before each retry attempt
        const checkNow = Date.now();
        if (checkNow >= deadline) {
          logger.warn(`[GLOBAL DEADLINE] Reached deadline during retry evaluation for @${username}. Aborting retries.`);
          break;
        }

        const remainingMs = Math.max(1000, deadline - checkNow);
        const perAccountTimeout = Math.min(ACCOUNT_TIMEOUT_MS, remainingMs);

        try {
          fetchResult = await this.runPythonScript(scriptPath, username, perAccountTimeout);

          if (fetchResult.rateLimited) {
            if (attempt <= 3) {
              const desiredWait = backoffDelays[attempt - 1];
              const waitRemaining = deadline - Date.now();
              if (waitRemaining <= 1000) {
                logger.warn(`[429 RETRY ABORT] No time remaining before 10-minute deadline to sleep ${desiredWait / 1000}s.`);
                break;
              }

              const actualWaitMs = Math.min(desiredWait, waitRemaining);
              const waitSec = Math.round(actualWaitMs / 1000);

              logger.warn(`[429 RETRY] @${username} encountered HTTP 429 Rate Limit (Attempt ${attempt}/3). Waiting ${waitSec}s...`);
              SchedulerService.statusMessage = `RATE LIMIT COOLDOWN: @${username} (Retry ${attempt}/3) - Waiting ${waitSec}s...`;
              
              await new Promise(r => setTimeout(r, actualWaitMs));

              if (Date.now() >= deadline) {
                logger.warn(`[429 RETRY ABORT] Deadline reached while waiting for @${username} backoff.`);
                break;
              }
              continue;
            } else {
              logger.warn(`[RATE LIMITED] @${username} remains rate-limited after 3 retry attempts.`);
            }
          } else {
            // Success, timedOut, or error
            break;
          }
        } catch (err: any) {
          logger.error(`[INSTALOADER ADAPTER] Execution failure for @${username}: ${err.message}`);
          fetchResult = { success: false, error: err.message };
          break;
        }
      }

      this.sourcesChecked++;

      if (fetchResult && fetchResult.success && Array.isArray(fetchResult.posts)) {
        this.sourcesSucceeded++;
        consecutiveRateLimits = 0;

        const pCount = fetchResult.postsChecked || 0;
        const rCount = fetchResult.reelsChecked || 0;
        let newReelCount = 0;

        for (const item of fetchResult.posts) {
          if (item.postType === 'REEL') {
            newReelCount++;
            logger.info(`[REELS FETCHED] account=@${username} shortcode=${item.shortcode || item.id} postUrl=${item.postUrl} publishedAt=${item.publishedAt}`);
          }
          allPosts.push({
            id: item.id,
            sourceAccount: `@${username}`,
            postUrl: item.postUrl,
            postType: item.postType || 'POST',
            caption: item.caption || '',
            mediaUrls: [],
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            hashtags: (item.caption || '').match(/#\w+/g) || []
          });
        }
        logger.info(`[INSTAGRAM] @${username}\n[POSTS] count=${pCount}\n[REELS] count=${rCount}\n[REELS ACCEPTED] count=${newReelCount}`);
      } else if (fetchResult && fetchResult.timedOut) {
        this.sourcesTimedOut++;
        this.errorsCount++;
        logger.warn(`[ACCOUNT TIMEOUT] @${username} timed out after ${ACCOUNT_TIMEOUT_MS}ms.`);
      } else if (fetchResult && fetchResult.rateLimited) {
        this.sourcesRateLimited++;
        consecutiveRateLimits++;
        logger.warn(`[RATE LIMITED RECORDED] @${username} marked as RATE_LIMITED.`);

        if (consecutiveRateLimits >= 3) {
          const globalWaitRemaining = deadline - Date.now();
          if (globalWaitRemaining > 1000) {
            const actualGlobalWait = Math.min(90000, globalWaitRemaining);
            const waitSec = Math.round(actualGlobalWait / 1000);
            logger.warn(`[GLOBAL RATE LIMIT DETECTED] 3 consecutive accounts rate limited. Pausing scanner for ${waitSec}s global cooldown...`);
            SchedulerService.statusMessage = `GLOBAL RATE LIMIT COOLDOWN: Waiting ${waitSec}s...`;
            await new Promise(r => setTimeout(r, actualGlobalWait));
          }
          consecutiveRateLimits = 0;
        }
      } else {
        this.sourcesFailed++;
        this.errorsCount++;
        const errMsg = fetchResult?.error || 'Unknown account fetch failure';
        logger.warn(`[INSTALOADER ADAPTER] Error fetching @${username}: ${errMsg}`);
      }

      // Update progress counters in SchedulerService
      SchedulerService.sourcesSucceeded = this.sourcesSucceeded;
      SchedulerService.sourcesFailed = this.sourcesFailed;
      SchedulerService.sourcesRateLimited = this.sourcesRateLimited;
      SchedulerService.sourcesTimedOut = this.sourcesTimedOut;

      // Rate-limit safe inter-account delay (checking deadline first)
      const remainingDelay = deadline - Date.now();
      if (remainingDelay <= 1000) break;
      const actualDelay = Math.min(ACCOUNT_DELAY_MS, remainingDelay);
      await new Promise(r => setTimeout(r, actualDelay));
    }

    if (this.sourcesRateLimited > 0 && this.sourcesSucceeded === 0) {
      this.rateLimited = true;
    }

    logger.info(`[INSTALOADER ADAPTER] Batch complete. Checked ${this.sourcesChecked}/${cleanUsernames.length} accounts (Succeeded: ${this.sourcesSucceeded}, Failed: ${this.sourcesFailed}, Rate Limited: ${this.sourcesRateLimited}, Timed Out: ${this.sourcesTimedOut}). Fetched ${allPosts.length} total posts.`);
    return allPosts;
  }

  private runPythonScript(scriptPath: string, username: string, timeoutMs: number = 25000): Promise<any> {
    return new Promise((resolve) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      let isSettled = false;

      const child = execFile(
        pythonCmd, 
        [scriptPath, username], 
        { timeout: timeoutMs, killSignal: 'SIGKILL' }, 
        (error, stdout, stderr) => {
          if (isSettled) return;
          isSettled = true;

          const combined = (stdout || '') + (stderr || '') + (error?.message || '');

          if (error && (error.killed || error.signal === 'SIGKILL' || error.signal === 'SIGTERM' || combined.includes('ETIMEDOUT') || combined.includes('timed out'))) {
            return resolve({ success: false, timedOut: true, error: `Account timeout after ${timeoutMs}ms` });
          }

          if (combined.includes('429') || combined.includes('Too Many Requests') || combined.includes('rate limit')) {
            return resolve({ success: false, rateLimited: true, error: 'HTTP 429 Too Many Requests' });
          }

          if (error || !stdout) {
            return resolve({ success: false, error: error?.message || 'Python execution failed' });
          }

          try {
            const parsed = JSON.parse(stdout.trim());
            resolve(parsed);
          } catch (jsonErr) {
            resolve({ success: false, error: 'Invalid JSON output from script' });
          }
        }
      );

      // Fallback kill timer to ensure child process is forcefully killed if hanging
      const fallbackKill = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            child.kill('SIGKILL');
          } catch (_) {}
          resolve({ success: false, timedOut: true, error: `Forcefully killed after ${timeoutMs + 2000}ms` });
        }
      }, timeoutMs + 2000);

      child.on('exit', () => clearTimeout(fallbackKill));
    });
  }
}
