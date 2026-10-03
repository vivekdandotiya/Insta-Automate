import axios from 'axios';
import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';

export class OfficialGraphApiAdapter implements InstagramAdapter {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.INSTAGRAM_GRAPH_API_TOKEN || '';
  }

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    const cleanUsername = sourceAccount.replace('@', '').trim();
    logger.info(`[GRAPH API ADAPTER] Querying Meta Graph API for account: @${cleanUsername}`);

    if (!this.accessToken) {
      const errorMsg = 'Configuration Required: INSTAGRAM_GRAPH_API_TOKEN is missing. Meta Graph API requires a valid Access Token.';
      logger.error(`[GRAPH API ADAPTER] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    try {
      // Meta Graph API Business Discovery Endpoint
      const response = await axios.get(`https://graph.facebook.com/v18.0/me`, {
        params: {
          fields: `business_discovery.username(${cleanUsername}){media{id,caption,media_url,media_type,timestamp,permalink}}`,
          access_token: this.accessToken
        },
        timeout: 10000
      });

      const mediaData = response.data?.business_discovery?.media?.data;
      if (!Array.isArray(mediaData)) return [];

      return mediaData.map((item: any) => ({
        id: String(item.id),
        sourceAccount,
        postUrl: item.permalink || `https://www.instagram.com/p/${item.id}/`,
        postType: item.media_type === 'VIDEO' ? 'REEL' : 'POST',
        caption: item.caption || '',
        mediaUrls: item.media_url ? [item.media_url] : [],
        publishedAt: new Date(item.timestamp),
        hashtags: (item.caption || '').match(/#\w+/g) || []
      }));
    } catch (error: any) {
      const graphError = error.response?.data?.error?.message || error.message;
      const failMsg = `Meta Graph API Request Failed for @${cleanUsername}: ${graphError} (Note: Meta Graph API Business Discovery requires target account to be a Business/Creator account and your app to have instagram_basic permission).`;
      logger.error(`[GRAPH API ADAPTER] ${failMsg}`);
      throw new Error(failMsg);
    }
  }
}
