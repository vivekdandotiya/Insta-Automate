import axios from 'axios';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class ApifyInstagramAdapter implements InstagramAdapter {
  private get apiToken(): string {
    const token = config.apifyApiToken || process.env.APIFY_API_TOKEN || '';
    return token.trim();
  }

  private get actorId(): string {
    const actor = config.apifyActorId || process.env.APIFY_ACTOR_ID || 'apify~instagram-scraper';
    return actor.trim() === '' ? 'apify~instagram-scraper' : actor.trim();
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

    const chunkSize = 35;
    const allPosts: RawInstagramPost[] = [];

    for (let i = 0; i < cleanUsernames.length; i += chunkSize) {
      const chunkUsernames = cleanUsernames.slice(i, i + chunkSize);
      const chunkUrls = chunkUsernames.map(u => `https://www.instagram.com/${u}/`);

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
              resultsLimit: 10,
              searchType: 'user',
              searchLimit: 1
            },
            {
              timeout: 90000,
              headers: { 'Content-Type': 'application/json' }
            }
          );

          if (!Array.isArray(response.data)) {
            logger.warn(`[APIFY ADAPTER] Unexpected non-array response returned for batch chunk (${chunkUsernames.length} accounts)`);
            break;
          }

          logger.info(`[APIFY ADAPTER] Successfully retrieved ${response.data.length} total items from Apify for chunk of ${chunkUsernames.length} accounts`);

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
            throw new Error(`Apify Authentication Failed (HTTP ${status}): Check your APIFY_API_TOKEN secret.`);
          }
          if (status === 429) {
            logger.warn(`[APIFY ADAPTER] Rate limit encountered (429). Attempt ${attempt} of ${maxRetries}...`);
            if (attempt === maxRetries) {
              throw new Error(`Apify Rate Limit Exceeded: ${msg}`);
            }
            await new Promise(r => setTimeout(r, 3000 * attempt));
            continue;
          }

          logger.error(`[APIFY ADAPTER] Chunk attempt ${attempt} failed: ${msg}`);
          if (attempt === maxRetries) {
            logger.error(`[APIFY ADAPTER] Skipping chunk after failed retries: ${msg}`);
          } else {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }
      }
    }

    return allPosts;
  }
}
