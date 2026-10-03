import axios from 'axios';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';

export class ScraperInstagramAdapter implements InstagramAdapter {
  private gatewayUrl: string;

  constructor(gatewayUrl?: string) {
    this.gatewayUrl = gatewayUrl || process.env.INSTAGRAM_SCRAPER_GATEWAY || '';
  }

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    const cleanUsername = sourceAccount.replace('@', '').trim();

    if (!this.gatewayUrl) {
      const errorMsg = 'CONFIGURATION REQUIRED: INSTAGRAM_SCRAPER_GATEWAY environment variable is not configured.';
      logger.error(`[SCRAPER ADAPTER] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    logger.info(`[SCRAPER ADAPTER] Requesting posts for @${cleanUsername} from gateway: ${this.gatewayUrl}`);

    try {
      const response = await axios.get(`${this.gatewayUrl}/user/${cleanUsername}/posts`, {
        timeout: 12000,
        headers: {
          'User-Agent': 'InstagramJobAgent/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error(`Empty response returned from Instagram scraper gateway for @${cleanUsername}`);
      }

      // Handle both array response formats: response.data or response.data.posts or response.data.items
      const items = Array.isArray(response.data)
        ? response.data
        : (response.data.posts || response.data.items || response.data.data);

      if (!Array.isArray(items)) {
        logger.warn(`[SCRAPER ADAPTER] Gateway response for @${cleanUsername} did not contain a valid posts array.`);
        return [];
      }

      return items.map((item: any, index: number) => {
        // Post ID Extraction
        const postId = String(item.id || item.code || item.shortcode || `post_${cleanUsername}_${index}`);

        // Post URL Extraction
        const postUrl = item.url || item.permalink || (item.code ? `https://www.instagram.com/p/${item.code}/` : `https://www.instagram.com/p/${postId}/`);

        // Post Type Determination
        const typeStr = String(item.type || item.media_type || '').toLowerCase();
        const isReel = item.is_reel === true || typeStr.includes('reel') || typeStr.includes('video');
        const postType: 'POST' | 'REEL' = isReel ? 'REEL' : 'POST';

        // Caption Text Extraction
        let caption = '';
        if (typeof item.caption === 'string') {
          caption = item.caption;
        } else if (item.caption && typeof item.caption.text === 'string') {
          caption = item.caption.text;
        } else if (typeof item.text === 'string') {
          caption = item.text;
        }

        // Media URL Extraction
        let mediaUrl = '';
        if (typeof item.media_url === 'string') {
          mediaUrl = item.media_url;
        } else if (typeof item.image_url === 'string') {
          mediaUrl = item.image_url;
        } else if (item.image_versions2?.candidates?.[0]?.url) {
          mediaUrl = item.image_versions2.candidates[0].url;
        } else if (Array.isArray(item.display_resources) && item.display_resources.length > 0) {
          mediaUrl = item.display_resources[item.display_resources.length - 1].src;
        }

        // Publication Timestamp Extraction
        let publishedAt = new Date();
        if (item.published_at) {
          publishedAt = new Date(item.published_at);
        } else if (item.taken_at) {
          // If unix timestamp in seconds
          const ts = typeof item.taken_at === 'number' ? item.taken_at : parseInt(item.taken_at, 10);
          publishedAt = new Date(ts > 10000000000 ? ts : ts * 1000);
        } else if (item.timestamp) {
          const ts = typeof item.timestamp === 'number' ? item.timestamp : parseInt(item.timestamp, 10);
          publishedAt = new Date(ts > 10000000000 ? ts : ts * 1000);
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
      const failMsg = `Scraper Gateway Request Failed for @${cleanUsername}: ${error.message}`;
      logger.error(`[SCRAPER ADAPTER] ${failMsg}`);
      throw new Error(failMsg);
    }
  }
}
