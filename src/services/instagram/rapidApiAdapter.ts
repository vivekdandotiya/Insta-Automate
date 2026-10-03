import axios from 'axios';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';

export class RapidApiInstagramAdapter implements InstagramAdapter {
  private apiKey: string;
  private apiHost: string;

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    this.apiHost = process.env.RAPIDAPI_HOST || 'instagram-bulk-scraper-latest.p.rapidapi.com';
  }

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    const cleanUsername = sourceAccount.replace('@', '').trim();

    if (!this.apiKey) {
      const errorMsg = 'CONFIGURATION REQUIRED: RAPIDAPI_KEY environment variable is not configured. Obtain an API key from https://rapidapi.com/';
      logger.error(`[RAPIDAPI ADAPTER] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    logger.info(`[RAPIDAPI ADAPTER] Querying Instagram profile posts for @${cleanUsername} via ${this.apiHost}...`);

    try {
      const url = `https://${this.apiHost}/web_profile_posts?username=${cleanUsername}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost
        }
      });

      const data = response.data;
      const items = Array.isArray(data) ? data : (data.posts || data.items || data.data);

      if (!Array.isArray(items)) {
        logger.warn(`[RAPIDAPI ADAPTER] Response for @${cleanUsername} did not contain a valid posts array.`);
        return [];
      }

      return items.map((item: any, index: number) => {
        const postId = String(item.id || item.code || item.shortcode || `rapid_${cleanUsername}_${index}`);
        const postUrl = item.permalink || item.url || (item.code ? `https://www.instagram.com/p/${item.code}/` : `https://www.instagram.com/p/${postId}/`);
        
        const isReel = item.is_video === true || item.is_reel === true || String(item.type || '').toLowerCase().includes('reel');
        const postType: 'POST' | 'REEL' = isReel ? 'REEL' : 'POST';

        const caption = typeof item.caption === 'string' ? item.caption : (item.caption?.text || item.text || '');
        const mediaUrl = item.display_url || item.media_url || item.image_url || '';

        let publishedAt = new Date();
        if (item.taken_at_timestamp) {
          publishedAt = new Date(item.taken_at_timestamp * 1000);
        } else if (item.taken_at) {
          const ts = typeof item.taken_at === 'number' ? item.taken_at : parseInt(item.taken_at, 10);
          publishedAt = new Date(ts > 10000000000 ? ts : ts * 1000);
        } else if (item.published_at) {
          publishedAt = new Date(item.published_at);
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
      const msg = error.response?.data?.message || error.message;

      if (status === 401 || status === 403) {
        throw new Error(`RapidAPI Authentication Failed (HTTP ${status}): Check your RAPIDAPI_KEY.`);
      }
      if (status === 429) {
        throw new Error(`RapidAPI Rate Limit Exceeded (HTTP 429): ${msg}`);
      }

      logger.error(`[RAPIDAPI ADAPTER] Request failed for @${cleanUsername}: ${msg}`);
      throw new Error(`RapidAPI Request Failed for @${cleanUsername}: ${msg}`);
    }
  }
}
