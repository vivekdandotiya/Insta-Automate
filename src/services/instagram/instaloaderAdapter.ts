import { execFile } from 'child_process';
import path from 'path';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';

export class InstaloaderInstagramAdapter implements InstagramAdapter {
  public sourcesChecked: number = 0;
  public rateLimited: boolean = false;
  public errorsCount: number = 0;

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    return this.fetchBatchPosts([sourceAccount]);
  }

  public async fetchBatchPosts(sourceAccounts: string[]): Promise<RawInstagramPost[]> {
    this.sourcesChecked = 0;
    this.rateLimited = false;
    this.errorsCount = 0;

    const cleanUsernames = sourceAccounts
      .map(a => a.replace('@', '').replace(/\//g, '').trim())
      .filter(Boolean);

    if (cleanUsernames.length === 0) return [];

    logger.info(`[INSTALOADER ADAPTER] Starting sequential fetch for ${cleanUsernames.length} public accounts...`);

    const allPosts: RawInstagramPost[] = [];
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'instaloader_fetch.py');

    for (const username of cleanUsernames) {
      if (this.rateLimited) {
        logger.warn(`[INSTALOADER ADAPTER] Skipping remaining accounts due to active rate limit (HTTP 429).`);
        break;
      }

      try {
        const output = await this.runPythonScript(scriptPath, username);

        if (output.rateLimited) {
          this.rateLimited = true;
          logger.warn(`[INSTALOADER ADAPTER] Rate limit (HTTP 429) detected while fetching @${username}. Halting scan cycle gracefully after checking ${this.sourcesChecked} accounts.`);
          break;
        }

        if (output.success && Array.isArray(output.posts)) {
          this.sourcesChecked++;
          const pCount = output.postsChecked || 0;
          const rCount = output.reelsChecked || 0;
          let newReelCount = 0;
          for (const item of output.posts) {
            if (item.postType === 'REEL') newReelCount++;
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
          logger.info(`[INSTAGRAM] @${username}\n[INSTAGRAM] Normal posts checked: ${pCount}\n[INSTAGRAM] Reels checked: ${rCount}\n[INSTAGRAM] New Reel jobs: ${newReelCount}`);
        } else {
          this.sourcesChecked++;
          if (output.error) {
            logger.warn(`[INSTALOADER ADAPTER] Error fetching @${username}: ${output.error}`);
            this.errorsCount++;
          }
        }
      } catch (err: any) {
        this.sourcesChecked++;
        this.errorsCount++;
        logger.error(`[INSTALOADER ADAPTER] Execution failure for @${username}: ${err.message}`);
      }

      // Throttle delay between account fetches to respect Instagram rate limits
      await new Promise(r => setTimeout(r, 1000));
    }

    logger.info(`[INSTALOADER ADAPTER] Batch complete. Checked ${this.sourcesChecked}/${cleanUsernames.length} accounts. Fetched ${allPosts.length} posts. Rate limited: ${this.rateLimited}`);
    return allPosts;
  }

  private runPythonScript(scriptPath: string, username: string): Promise<any> {
    return new Promise((resolve) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      execFile(pythonCmd, [scriptPath, username], { timeout: 30000 }, (error, stdout, stderr) => {
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
