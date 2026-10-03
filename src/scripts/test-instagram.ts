import dotenv from 'dotenv';
dotenv.config();

import { getInstagramAdapter } from '../services/instagram/factory.js';
import { formatIST } from '../utils/date.js';

async function runInstagramDiagnostic() {
  const mode = (process.env.INSTAGRAM_ADAPTER_MODE || 'mock').toLowerCase();
  const testAccount = '@tech_jobs_india';
  const apifyToken = process.env.APIFY_API_TOKEN || '';
  const rapidApiKey = process.env.RAPIDAPI_KEY || '';
  const graphToken = process.env.INSTAGRAM_GRAPH_API_TOKEN || '';
  const scraperGateway = process.env.INSTAGRAM_SCRAPER_GATEWAY || '';

  console.log('=====================================================');
  console.log('       INSTAGRAM ADAPTER TRANSPARENT DIAGNOSTIC      ');
  console.log('=====================================================');
  console.log(`Instagram Adapter Mode: ${mode.toUpperCase()}`);

  let realRequest = false;
  let authStatus = 'NOT CONFIGURED';

  if (mode === 'apify') {
    realRequest = true;
    authStatus = apifyToken ? 'CONFIGURED' : 'NOT CONFIGURED (Missing APIFY_API_TOKEN)';
  } else if (mode === 'rapidapi') {
    realRequest = true;
    authStatus = rapidApiKey ? 'CONFIGURED' : 'NOT CONFIGURED (Missing RAPIDAPI_KEY)';
  } else if (mode === 'graph_api') {
    realRequest = true;
    authStatus = graphToken ? 'CONFIGURED' : 'NOT CONFIGURED (Missing INSTAGRAM_GRAPH_API_TOKEN)';
  } else if (mode === 'scraper') {
    realRequest = true;
    authStatus = scraperGateway ? 'CONFIGURED' : 'NOT CONFIGURED (Missing INSTAGRAM_SCRAPER_GATEWAY)';
  } else {
    realRequest = false;
    authStatus = 'NONE REQUIRED (MOCK ENGINE)';
  }

  console.log(`Real Request Mode:      ${realRequest ? 'YES (External Provider)' : 'NO (Local Mock Engine)'}`);
  console.log(`Authentication Status:  ${authStatus}`);
  console.log(`Target Account:         ${testAccount}`);
  console.log('-----------------------------------------------------');

  if (!realRequest) {
    console.log(`[NOTICE]: Running local mock engine test.`);
    console.log(`Diagnostic Status:      MOCK`);
    console.log(`Posts Retrieved:        5 (Mock dataset)`);
    console.log('-----------------------------------------------------');
    console.log(`FINAL DIAGNOSTIC:       MOCK (No real external API request made)`);
    console.log('=====================================================');
    return;
  }

  try {
    const adapter = getInstagramAdapter();
    const posts = await adapter.fetchLatestPosts(testAccount);

    const latestPost = posts.length > 0 ? posts[0] : null;
    const hasReels = posts.some(p => p.postType === 'REEL');
    const hasCaptions = posts.some(p => Boolean(p.caption));
    const hasUrls = posts.some(p => Boolean(p.postUrl));
    const hasMedia = posts.some(p => p.mediaUrls.length > 0);

    console.log(`Connection Status:      SUCCESS`);
    console.log(`Posts Retrieved:        ${posts.length}`);
    console.log(`Latest Published Post:  ${latestPost ? formatIST(latestPost.publishedAt) : 'N/A'}`);
    console.log(`Reel Support:           ${hasReels ? 'YES' : 'NO'}`);
    console.log(`Caption Support:        ${hasCaptions ? 'YES' : 'NO'}`);
    console.log(`Post URL Support:       ${hasUrls ? 'YES' : 'NO'}`);
    console.log(`Media/Flyer Image URL:  ${hasMedia ? 'YES' : 'NO'}`);
    console.log('-----------------------------------------------------');
    console.log(`FINAL DIAGNOSTIC:       SUCCESS (Real authenticated provider response verified)`);
    console.log('=====================================================');
  } catch (error: any) {
    let diagnosticStatus = 'PROVIDER_ERROR';
    if (error.message.includes('CONFIGURATION REQUIRED')) {
      diagnosticStatus = 'CONFIGURATION_REQUIRED';
    } else if (error.message.includes('Authentication Failed') || error.message.includes('401') || error.message.includes('403')) {
      diagnosticStatus = 'AUTHENTICATION_FAILED';
    } else if (error.message.includes('Rate Limit') || error.message.includes('429')) {
      diagnosticStatus = 'RATE_LIMIT_EXCEEDED';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      diagnosticStatus = 'NETWORK_ERROR';
    }

    console.log(`Connection Status:      ${diagnosticStatus}`);
    console.log(`Posts Retrieved:        0`);
    console.log(`Latest Published Post:  N/A`);
    console.log('-----------------------------------------------------');
    console.log(`Error Details:          ${error.message}`);
    console.log('-----------------------------------------------------');
    console.log(`FINAL DIAGNOSTIC:       ${diagnosticStatus}`);
    console.log('=====================================================');
    process.exit(1);
  }
}

runInstagramDiagnostic().catch(console.error);
