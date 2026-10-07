import axios from 'axios';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { SchedulerService } from '../scheduler.service.js';

export interface InstagramHealthCheckResult {
  instagramReachable: boolean;
  profileLookup: 'SUCCESS' | 'RATE_LIMITED' | 'FORBIDDEN' | 'ERROR';
  posts: 'SUCCESS' | 'ERROR';
  reels: 'SUCCESS' | 'ERROR';
  statusCode: number;
  provider: string;
  actorId: string;
  sessionConfigured: boolean;
  error: string | null;
}

export class ApifyInstagramAdapter implements InstagramAdapter {
  public sourcesChecked: number = 0;
  public sourcesSucceeded: number = 0;
  public sourcesFailed: number = 0;
  public sourcesRateLimited: number = 0;
  public sourcesTimedOut: number = 0;
  public profileLookup429: number = 0;
  public profileLookup403: number = 0;
  public profileLookupOtherError: number = 0;
  public rateLimited: boolean = false;
  public errorsCount: number = 0;

  private get apiToken(): string {
    const token = config.apifyApiToken || process.env.APIFY_API_TOKEN || '';
    return token.trim();
  }

  private get actorId(): string {
    const actor = config.apifyActorId || process.env.APIFY_ACTOR_ID || 'apify~instagram-scraper';
    return actor.trim() === '' ? 'apify~instagram-scraper' : actor.trim();
  }

  /**
   * Run lightweight 1-account diagnostic test for Apify backend reachable status.
   */
  public async runHealthCheck(testAccount: string = 'karrar_hussain_jobs'): Promise<InstagramHealthCheckResult> {
    const token = this.apiToken;
    const sessionConfigured = Boolean(token);

    if (!token) {
      return {
        instagramReachable: false,
        profileLookup: 'ERROR',
        posts: 'ERROR',
        reels: 'ERROR',
        statusCode: 401,
        provider: 'apify',
        actorId: this.actorId,
        sessionConfigured: false,
        error: 'APIFY_API_TOKEN environment variable is not configured on Render.'
      };
    }

    const cleanUsername = testAccount.replace('@', '').replace(/\//g, '').trim();
    logger.info(`[APIFY HEALTH CHECK] Testing diagnostic fetch on @${cleanUsername} via Apify Actor (${this.actorId})...`);

    try {
      const url = `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items?token=${token}`;
      const response = await axios.post(
        url,
        {
          usernames: [cleanUsername],
          directUrls: [`https://www.instagram.com/${cleanUsername}/`],
          resultsType: 'posts',
          resultsLimit: 5,
          searchType: 'user',
          searchLimit: 1
        },
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (Array.isArray(response.data)) {
        const hasReels = response.data.some((item: any) => {
          const typeStr = String(item.type || item.productType || '').toLowerCase();
          return item.isReel === true || typeStr.includes('video') || typeStr.includes('reel') || typeStr.includes('clip');
        });

        return {
          instagramReachable: true,
          profileLookup: 'SUCCESS',
          posts: 'SUCCESS',
          reels: hasReels ? 'SUCCESS' : 'SUCCESS',
          statusCode: 200,
          provider: 'apify',
          actorId: this.actorId,
          sessionConfigured: true,
          error: null
        };
      } else {
        return {
          instagramReachable: false,
          profileLookup: 'ERROR',
          posts: 'ERROR',
          reels: 'ERROR',
          statusCode: 500,
          provider: 'apify',
          actorId: this.actorId,
          sessionConfigured: true,
          error: 'Apify returned unexpected non-array response payload.'
        };
      }
    } catch (err: any) {
      const status = err.response?.status || 500;
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;

      let lookupStatus: 'RATE_LIMITED' | 'FORBIDDEN' | 'ERROR' = 'ERROR';
      if (status === 429) lookupStatus = 'RATE_LIMITED';
      else if (status === 401 || status === 403) lookupStatus = 'FORBIDDEN';

      return {
        instagramReachable: false,
        profileLookup: lookupStatus,
        posts: 'ERROR',
        reels: 'ERROR',
        statusCode: status,
        provider: 'apify',
        actorId: this.actorId,
        sessionConfigured: true,
        error: `Apify error (HTTP ${status}): ${errMsg}`
      };
    }
  }

  /**
   * Fetch posts for a single account by delegating to batch fetcher.
   */
  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    return this.fetchBatchPosts([sourceAccount]);
  }

  /**
   * Fetch posts for multiple accounts in optimized Apify Actor batch execution cycles.
   */
  public async fetchBatchPosts(sourceAccounts: string[]): Promise<RawInstagramPost[]> {
    this.sourcesChecked = 0;
    this.sourcesSucceeded = 0;
    this.sourcesFailed = 0;
    this.sourcesRateLimited = 0;
    this.sourcesTimedOut = 0;
    this.profileLookup429 = 0;
    this.profileLookup403 = 0;
    this.profileLookupOtherError = 0;
    this.rateLimited = false;
    this.errorsCount = 0;

    const token = this.apiToken;
    if (!token) {
      const errorMsg = 'CONFIGURATION REQUIRED: APIFY_API_TOKEN environment variable is not configured. Obtain an API token from https://console.apify.com/account/integrations';
      logger.error(`[APIFY ADAPTER] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const cleanUsernames = sourceAccounts
      .map(a => a.replace('@', '').replace(/\//g, '').trim())
      .filter(Boolean);

    if (cleanUsernames.length === 0) {
      return [];
    }

    logger.info(`[APIFY ADAPTER] Requesting Instagram feeds for ${cleanUsernames.length} accounts via Apify Actor (${this.actorId})...`);

    const chunkSize = 25;
    const allPosts: RawInstagramPost[] = [];

    for (let i = 0; i < cleanUsernames.length; i += chunkSize) {
      const chunkUsernames = cleanUsernames.slice(i, i + chunkSize);
      const chunkUrls = chunkUsernames.map(u => `https://www.instagram.com/${u}/`);

      this.sourcesChecked += chunkUsernames.length;
      SchedulerService.currentIndex = Math.min(cleanUsernames.length, i + chunkUsernames.length);
      SchedulerService.totalSources = cleanUsernames.length;
      SchedulerService.currentAccount = `@${chunkUsernames[0]} (+${chunkUsernames.length - 1})`;
      SchedulerService.statusMessage = `Processing batch ${Math.floor(i / chunkSize) + 1} (${chunkUsernames.length} accounts)...`;

      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const url = `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items?token=${token}`;
          
          const response = await axios.post(
            url,
            {
              usernames: chunkUsernames,
              directUrls: chunkUrls,
              resultsType: 'posts',
              resultsLimit: 5,
              searchType: 'user',
              searchLimit: 1
            },
            {
              timeout: 120000,
              headers: { 'Content-Type': 'application/json' }
            }
          );

          if (!Array.isArray(response.data)) {
            logger.warn(`[APIFY ADAPTER] Unexpected non-array response returned for batch chunk (${chunkUsernames.length} accounts)`);
            this.sourcesFailed += chunkUsernames.length;
            this.profileLookupOtherError += chunkUsernames.length;
            break;
          }

          logger.info(`[APIFY ADAPTER] Successfully retrieved ${response.data.length} total items from Apify for chunk of ${chunkUsernames.length} accounts`);
          this.sourcesSucceeded += chunkUsernames.length;

          const mappedPosts = response.data.map((item: any, index: number) => {
            const rawOwner = item.ownerUsername || item.owner?.username || item.inputUrl?.split('/')?.[3] || chunkUsernames[0];
            const cleanOwner = String(rawOwner).replace('@', '').trim();
            
            const postId = String(item.id || item.shortCode || item.id_ || `apify_${cleanOwner}_${index}`);
            const postUrl = item.url || item.postUrl || item.canonicalUrl || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : `https://www.instagram.com/p/${postId}/`);
            
            const typeStr = String(item.type || item.productType || '').toLowerCase();
            const isReel = item.isReel === true || typeStr.includes('video') || typeStr.includes('reel') || typeStr.includes('clip');
            const postType: 'POST' | 'REEL' = isReel ? 'REEL' : 'POST';

            let caption = '';
            if (typeof item.caption === 'string') {
              caption = item.caption;
            } else if (item.caption && typeof item.caption.text === 'string') {
              caption = item.caption.text;
            } else if (typeof item.text === 'string') {
              caption = item.text;
            }

            let mediaUrl = item.displayUrl || item.imageUrl || item.thumbnailUrl || (Array.isArray(item.images) && item.images[0]) || '';
            
            let publishedAt = new Date();
            if (item.timestamp) {
              publishedAt = new Date(item.timestamp);
            } else if (item.takenAt) {
              publishedAt = new Date(item.takenAt);
            } else if (item.takenAtTimestamp) {
              publishedAt = new Date(item.takenAtTimestamp * 1000);
            }

            return {
              id: postId,
              sourceAccount: `@${cleanOwner}`,
              postUrl,
              postType,
              caption,
              mediaUrls: mediaUrl ? [mediaUrl] : [],
              publishedAt,
              hashtags: caption.match(/#\w+/g) || []
            };
          });

          allPosts.push(...mappedPosts);
          break;
        } catch (error: any) {
          const status = error.response?.status;
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
          
          if (status === 401 || status === 403) {
            this.sourcesFailed += chunkUsernames.length;
            this.profileLookup403 += chunkUsernames.length;
            throw new Error(`Apify Authentication Failed (HTTP ${status}): Check your APIFY_API_TOKEN secret in Render environment settings.`);
          }
          if (status === 429) {
            this.profileLookup429 += chunkUsernames.length;
            logger.warn(`[APIFY ADAPTER] Rate limit encountered (429). Attempt ${attempt} of ${maxRetries}...`);
            if (attempt === maxRetries) {
              this.sourcesRateLimited += chunkUsernames.length;
              throw new Error(`Apify Rate Limit Exceeded: ${msg}`);
            }
            await new Promise(r => setTimeout(r, 3000 * attempt));
            continue;
          }

          if (attempt === maxRetries) {
            this.sourcesFailed += chunkUsernames.length;
            this.profileLookupOtherError += chunkUsernames.length;
            logger.error(`[APIFY ADAPTER] Skipping chunk after failed retries: ${msg}`);
          } else {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }
      }

      SchedulerService.sourcesSucceeded = this.sourcesSucceeded;
      SchedulerService.sourcesFailed = this.sourcesFailed;
      SchedulerService.sourcesRateLimited = this.sourcesRateLimited;
    }

    logger.info(`[APIFY ADAPTER] Batch complete. Processed ${this.sourcesChecked}/${cleanUsernames.length} accounts. Retrieved ${allPosts.length} total posts/reels.`);
    return allPosts;
  }
}
