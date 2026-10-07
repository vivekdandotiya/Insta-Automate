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
  const mode = (config.instagramAdapterMode || 'apify').toLowerCase();

  if (mode === 'rapidapi') {
    logger.info('Using RapidAPI Instagram Data Adapter');
    return new RapidApiInstagramAdapter();
  }
  if (mode === 'graph_api') {
    logger.info('Using Official Meta Graph API Instagram Adapter');
    return new OfficialGraphApiAdapter();
  }
  if (mode === 'scraper') {
    logger.info('Using Custom Scraper Gateway Instagram Adapter');
    return new ScraperInstagramAdapter();
  }
  if (mode === 'mock') {
    logger.info('Using Mock Instagram Adapter for local testing & demo');
    return new MockInstagramAdapter();
  }

  // Primary Production Acquisition: Apify Instagram Actor Adapter
  logger.info('Using Apify Instagram Actor Adapter (Primary Production Acquisition)');
  return new ApifyInstagramAdapter();
}
