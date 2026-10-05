import { Router, Request, Response } from 'express';
import { prisma } from '../db/client.js';
import { config } from '../config/index.js';
import { ClassifierService } from '../services/classifier.service.js';
import { FilterService } from '../services/filter.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { formatIST } from '../utils/date.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { relevance, limit = 50 } = req.query;
    const where: any = {};
    if (relevance) {
      where.relevance_score = String(relevance);
    }

    const posts = await prisma.processedPost.findMany({
      where,
      include: { job_alert: true },
      orderBy: { published_at: 'desc' },
      take: Number(limit)
    });

    const formatted = posts.map(p => ({
      ...p,
      publishedAtFormatted: formatIST(p.published_at),
      detectedAtFormatted: formatIST(p.detected_at)
    }));

    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const totalScanned = await prisma.processedPost.count();
    const jobPostsCount = await prisma.processedPost.count({ where: { classification: 'JOB_POST' } });
    const notificationsCount = await prisma.jobAlert.count({ where: { notification_sent: true } });
    const highRelevanceCount = await prisma.processedPost.count({ where: { relevance_score: 'HIGH' } });
    const mediumRelevanceCount = await prisma.processedPost.count({ where: { relevance_score: 'MEDIUM' } });
    const irrelevantCount = await prisma.processedPost.count({ where: { relevance_score: 'IRRELEVANT' } });

    res.json({
      success: true,
      data: {
        totalScanned,
        jobPostsCount,
        notificationsCount,
        highRelevanceCount,
        mediumRelevanceCount,
        irrelevantCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await prisma.processedPost.findUnique({
      where: { id },
      include: { job_alert: true }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Job record not found' });
    }

    res.json({
      success: true,
      data: {
        ...post,
        publishedAtFormatted: formatIST(post.published_at),
        detectedAtFormatted: formatIST(post.detected_at)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual Test Sandbox Endpoint (Requirement 23)
router.post('/test/classify', async (req: Request, res: Response) => {
  try {
    const { caption, imageUrl } = req.body;
    if (!caption && !imageUrl) {
      return res.status(400).json({ success: false, error: 'Caption or Image URL is required' });
    }

    const classification = await ClassifierService.processContent(caption || '', imageUrl ? [imageUrl] : []);
    const filterEvaluation = await FilterService.isMatch(classification);

    res.json({
      success: true,
      data: {
        classification,
        filterEvaluation
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Instagram Connection Endpoint (Requirements 2, 3, 4)
router.post('/test/instagram', async (req: Request, res: Response) => {
  const mode = (process.env.INSTAGRAM_ADAPTER_MODE || 'mock').toLowerCase();
  const testAccount = '@tech_jobs_india';

  const apifyToken = process.env.APIFY_API_TOKEN || '';
  const rapidApiKey = process.env.RAPIDAPI_KEY || '';
  const graphToken = process.env.INSTAGRAM_GRAPH_API_TOKEN || '';
  const scraperGateway = process.env.INSTAGRAM_SCRAPER_GATEWAY || '';

  let isRealRequest = mode !== 'mock';
  let authStatus = 'NOT CONFIGURED';

  if (mode === 'apify') {
    authStatus = apifyToken ? 'CONFIGURED' : 'NOT CONFIGURED (Missing APIFY_API_TOKEN)';
  } else if (mode === 'rapidapi') {
    authStatus = rapidApiKey ? 'CONFIGURED' : 'NOT CONFIGURED (Missing RAPIDAPI_KEY)';
  } else if (mode === 'graph_api') {
    authStatus = graphToken ? 'CONFIGURED' : 'NOT CONFIGURED (Missing INSTAGRAM_GRAPH_API_TOKEN)';
  } else if (mode === 'scraper') {
    authStatus = scraperGateway ? 'CONFIGURED' : 'NOT CONFIGURED (Missing INSTAGRAM_SCRAPER_GATEWAY)';
  } else {
    authStatus = 'NONE REQUIRED (MOCK MODE)';
  }

  if (!isRealRequest) {
    return res.json({
      success: true,
      data: {
        adapter: mode.toUpperCase(),
        realRequest: false,
        authentication: authStatus,
        account: testAccount,
        connection: 'MOCK',
        postsRetrieved: 5,
        status: 'MOCK',
        notice: 'Previous diagnostic was a local MOCK engine test. To run a real request, set INSTAGRAM_ADAPTER_MODE=apify and supply APIFY_API_TOKEN.'
      }
    });
  }

  try {
    const { getInstagramAdapter } = await import('../services/instagram/factory.js');
    const adapter = getInstagramAdapter();
    const posts = await adapter.fetchLatestPosts(testAccount);

    const latestPost = posts.length > 0 ? posts[0] : null;

    res.json({
      success: true,
      data: {
        adapter: mode.toUpperCase(),
        realRequest: true,
        authentication: authStatus,
        account: testAccount,
        connection: 'SUCCESS',
        postsRetrieved: posts.length,
        latestPostTimestamp: latestPost ? formatIST(latestPost.publishedAt) : 'N/A',
        reelSupport: posts.some(p => p.postType === 'REEL') ? 'YES' : 'NO',
        captionSupport: posts.some(p => Boolean(p.caption)) ? 'YES' : 'NO',
        urlAvailable: posts.some(p => Boolean(p.postUrl)) ? 'YES' : 'NO',
        mediaAvailable: posts.some(p => p.mediaUrls.length > 0) ? 'YES' : 'NO',
        status: 'SUCCESS'
      }
    });
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

    res.status(400).json({
      success: false,
      data: {
        adapter: mode.toUpperCase(),
        realRequest: true,
        authentication: authStatus,
        account: testAccount,
        connection: diagnosticStatus,
        postsRetrieved: 0,
        status: diagnosticStatus,
        errorDetails: error.message
      }
    });
  }
});

// Test Telegram Notification (Requirement 5)
router.post('/test/telegram', async (req: Request, res: Response) => {
  if (!config.telegramBotToken || !config.telegramChatId) {
    return res.status(400).json({
      success: false,
      status: 'CONFIGURATION REQUIRED',
      message: 'CONFIGURATION REQUIRED: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables must be configured to send real Telegram messages.'
    });
  }

  try {
    const now = new Date();
    const samplePayload = {
      company: 'ABC Technologies (Live Test)',
      role: 'Full Stack Developer',
      location: 'Noida / Delhi NCR',
      experience: '0-2 Years / Freshers',
      salary: '6-8 LPA',
      workMode: 'Hybrid',
      employmentType: 'Full Time',
      publishedAt: now,
      detectedAt: now,
      relevanceScore: 'HIGH',
      sourceAccount: '@live_test_account',
      postUrl: 'https://www.instagram.com/p/LIVE_TEST_ALERT/',
      applicationLink: 'https://abctech.careers/job/test'
    };

    const sent = await TelegramService.sendAlert(samplePayload);
    if (sent) {
      res.json({
        success: true,
        status: 'VERIFIED',
        message: `Real Telegram notification successfully delivered to Chat ID ${config.telegramChatId}`
      });
    } else {
      res.status(500).json({
        success: false,
        status: 'FAILED',
        message: 'Telegram API call failed. Verify your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID values.'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'FAILED', error: err.message });
  }
});

export default router;
