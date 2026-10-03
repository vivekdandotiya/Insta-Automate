import axios from 'axios';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';

export class ApifyInstagramAdapter implements InstagramAdapter {
  private apiToken: string;
  private actorId: string;

  constructor() {
    this.apiToken = process.env.APIFY_API_TOKEN || '';
    this.actorId = process.env.APIFY_ACTOR_ID || 'apify~instagram-scraper';
  }

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    const cleanUsername = sourceAccount.replace('@', '').trim();

    if (!this.apiToken) {
      const errorMsg = 'CONFIGURATION REQUIRED: APIFY_API_TOKEN environment variable is not configured. Obtain an API token from https://console.apify.com/account/integrations';
      logger.error(`[APIFY ADAPTER] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    logger.info(`[APIFY ADAPTER] Requesting Instagram feed for @${cleanUsername} via Apify Actor (${this.actorId})...`);

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items?token=${this.apiToken}`;
        
        const response = await axios.post(
          url,
          {
            directUrls: [`https://www.instagram.com/${cleanUsername}/`],
            resultsType: 'posts',
            resultsLimit: 10,
            searchType: 'user',
            searchLimit: 1
          },
          {
            timeout: 45000,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (!Array.isArray(response.data)) {
          logger.warn(`[APIFY ADAPTER] Unexpected non-array response returned for @${cleanUsername}`);
          return [];
        }

        logger.info(`[APIFY ADAPTER] Successfully retrieved ${response.data.length} posts for @${cleanUsername}`);

        return response.data.map((item: any, index: number) => {
          const postId = String(item.id || item.shortCode || `apify_${cleanUsername}_${index}`);
          const postUrl = item.url || item.postUrl || `https://www.instagram.com/p/${item.shortCode || postId}/`;
          
          const typeStr = String(item.type || '').toLowerCase();
          const isReel = item.isReel === true || typeStr.includes('video') || typeStr.includes('reel');
          const postType: 'POST' | 'REEL' = isReel ? 'REEL' : 'POST';

          const caption = typeof item.caption === 'string' ? item.caption : (item.caption?.text || '');
          const mediaUrl = item.displayUrl || item.imageUrl || (Array.isArray(item.images) && item.images[0]) || '';
          
          let publishedAt = new Date();
          if (item.timestamp) {
            publishedAt = new Date(item.timestamp);
          } else if (item.takenAt) {
            publishedAt = new Date(item.takenAt);
          }

          return {
            id: postId,
            sourceAccount: `@${cleanUsername}`,
            postUrl,
            postType,
            caption,
            mediaUrls: mediaUrl ? [mediaUrl] : [],
            publishedAt,
            hashtags: caption.match(/#\w+/g) || []
          };
        });
      } catch (error: any) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        
        if (status === 401 || status === 403) {
          throw new Error(`Apify Authentication Failed (HTTP ${status}): Check your APIFY_API_TOKEN.`);
        }
        if (status === 429) {
          logger.warn(`[APIFY ADAPTER] Rate limit encountered (429). Attempt ${attempt} of ${maxRetries}...`);
          if (attempt === maxRetries) {
            throw new Error(`Apify Rate Limit Exceeded: ${msg}`);
          }
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }

        logger.error(`[APIFY ADAPTER] Attempt ${attempt} failed for @${cleanUsername}: ${msg}`);
        if (attempt === maxRetries) {
          throw new Error(`Apify Instagram Request Failed for @${cleanUsername}: ${msg}`);
        }
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    return [];
  }
}
