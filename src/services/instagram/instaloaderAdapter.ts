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
    this.rateLimited = false;
    this.errorsCount = 0;

    const cleanUsernames = sourceAccounts
      .map(a => a.replace('@', '').replace(/\//g, '').trim())
      .filter(Boolean);

    if (cleanUsernames.length === 0) return [];

    logger.info(`[INSTALOADER ADAPTER] Starting safe sequential fetch for ${cleanUsernames.length} public accounts...`);

    const allPosts: RawInstagramPost[] = [];
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'instaloader_fetch.py');
    const startTimeMs = Date.now();
    const MAX_SCAN_DURATION_MS = (parseInt(process.env.MAX_SCAN_DURATION_MINUTES || '10', 10)) * 60 * 1000;
    const ACCOUNT_DELAY_MS = parseInt(process.env.INSTAGRAM_ACCOUNT_DELAY_MS || '2000', 10);

    let consecutiveRateLimits = 0;

    for (let i = 0; i < cleanUsernames.length; i++) {
      const username = cleanUsernames[i];
      const elapsed = Date.now() - startTimeMs;

      if (elapsed >= MAX_SCAN_DURATION_MS) {
        logger.warn(`[INSTALOADER ADAPTER] Maximum scan safety limit reached (${(elapsed / 1000 / 60).toFixed(1)} mins). Halting batch fetch safely.`);
        SchedulerService.statusMessage = `Scan reached safety limit of ${Math.round(elapsed / 60000)} minutes`;
        break;
      }

      SchedulerService.currentAccount = `@${username}`;
      SchedulerService.currentIndex = i + 1;
      SchedulerService.totalSources = cleanUsernames.length;
      SchedulerService.sourcesSucceeded = this.sourcesSucceeded;
      SchedulerService.sourcesFailed = this.sourcesFailed;
      SchedulerService.sourcesRateLimited = this.sourcesRateLimited;

      logger.info(`[SCAN] [${i + 1}/${cleanUsernames.length}] Fetching @${username}...`);

      let fetchResult: any = null;
      const backoffDelays = [30000, 60000, 120000]; // 30s, 60s, 120s backoff

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          fetchResult = await this.runPythonScript(scriptPath, username);

          if (fetchResult.rateLimited) {
            if (attempt <= 3) {
              const waitMs = backoffDelays[attempt - 1];
              logger.warn(`[429 RETRY] @${username} encountered HTTP 429 Rate Limit (Attempt ${attempt}/3). Waiting ${waitMs / 1000}s before backoff retry...`);
              SchedulerService.statusMessage = `Rate limit cooldown for @${username}: waiting ${waitMs / 1000}s...`;
              await new Promise(r => setTimeout(r, waitMs));
              continue;
            } else {
              logger.warn(`[RATE LIMITED] @${username} remains rate-limited after 3 retry attempts.`);
            }
          } else {
            // Success or non-429 output
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
        SchedulerService.statusMessage = `Scanning @${username}...`;

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
      } else if (fetchResult && fetchResult.rateLimited) {
        this.sourcesRateLimited++;
        consecutiveRateLimits++;
        logger.warn(`[RATE LIMITED RECORDED] @${username} marked as RATE_LIMITED.`);

        if (consecutiveRateLimits >= 3) {
          logger.warn(`[GLOBAL RATE LIMIT DETECTED] 3 consecutive accounts rate limited. Pausing scanner for 90 seconds global cooldown...`);
          SchedulerService.statusMessage = `GLOBAL RATE LIMIT DETECTED: Cooldown active (90s)...`;
          await new Promise(r => setTimeout(r, 90000));
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

      // Rate-limit safe inter-account delay
      await new Promise(r => setTimeout(r, ACCOUNT_DELAY_MS));
    }

    if (this.sourcesRateLimited > 0 && this.sourcesSucceeded === 0) {
      this.rateLimited = true;
    }

    logger.info(`[INSTALOADER ADAPTER] Batch complete. Checked ${this.sourcesChecked}/${cleanUsernames.length} accounts (Succeeded: ${this.sourcesSucceeded}, Failed: ${this.sourcesFailed}, Rate Limited: ${this.sourcesRateLimited}). Fetched ${allPosts.length} total posts.`);
    return allPosts;
  }

  private runPythonScript(scriptPath: string, username: string): Promise<any> {
    return new Promise((resolve) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      execFile(pythonCmd, [scriptPath, username], { timeout: 35000 }, (error, stdout, stderr) => {
        const combined = (stdout || '') + (stderr || '') + (error?.message || '');
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
      });
    });
  }
}
