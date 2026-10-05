import { InstagramAdapter } from './adapter.interface.js';
import { MockInstagramAdapter } from './mockAdapter.js';
import { ScraperInstagramAdapter } from './scraperAdapter.js';
import { OfficialGraphApiAdapter } from './graphApiAdapter.js';
import { ApifyInstagramAdapter } from './apifyAdapter.js';
import { RapidApiInstagramAdapter } from './rapidApiAdapter.js';
import { InstaloaderInstagramAdapter } from './instaloaderAdapter.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export function getInstagramAdapter(): InstagramAdapter {
  const mode = (config.instagramAdapterMode || 'instaloader').toLowerCase();

  switch (mode) {
    case 'instaloader':
      logger.info('Using Self-Hosted Instaloader Open-Source Instagram Adapter');
      return new InstaloaderInstagramAdapter();
    case 'apify':
      logger.info('Using Apify Instagram Actor Adapter (Public Accounts & Reels Support)');
      return new ApifyInstagramAdapter();
    case 'rapidapi':
      logger.info('Using RapidAPI Instagram Data Adapter');
      return new RapidApiInstagramAdapter();
    case 'graph_api':
      logger.info('Using Official Meta Graph API Instagram Adapter');
      return new OfficialGraphApiAdapter();
    case 'scraper':
      logger.info('Using Custom Scraper Gateway Instagram Adapter');
      return new ScraperInstagramAdapter();
    case 'mock':
      logger.info('Using Mock Instagram Adapter for local testing & demo');
      return new MockInstagramAdapter();
    default:
      logger.info('Defaulting to Self-Hosted Instaloader Open-Source Instagram Adapter');
      return new InstaloaderInstagramAdapter();
  }
}
