import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  // Monitoring & Scheduled Execution Settings
  pollIntervalHours: parseInt(process.env.POLL_INTERVAL_HOURS || '2', 10),
  checkIntervalSeconds: parseInt(process.env.CHECK_INTERVAL_SECONDS || '300', 10),
  minRelevanceScore: process.env.MIN_RELEVANCE_SCORE || 'MEDIUM',
  
  // Telegram Bot Secrets
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  
  // AI Classifier Configuration
  aiProvider: process.env.AI_PROVIDER || 'openai',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  aiApiKey: process.env.AI_API_KEY || '',
  
  // OCR Feature Flag
  ocrEnabled: process.env.OCR_ENABLED !== 'false',
  
  // Instagram Access Mode Choices: apify | rapidapi | graph_api | scraper | mock
  instagramAdapterMode: process.env.INSTAGRAM_ADAPTER_MODE || 'apify',
  apifyApiToken: process.env.APIFY_API_TOKEN || '',
  apifyActorId: process.env.APIFY_ACTOR_ID || 'apify~instagram-scraper',
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  rapidApiHost: process.env.RAPIDAPI_HOST || 'instagram-bulk-scraper-latest.p.rapidapi.com',
  instagramGraphApiToken: process.env.INSTAGRAM_GRAPH_API_TOKEN || '',
  instagramScraperGateway: process.env.INSTAGRAM_SCRAPER_GATEWAY || ''
};
