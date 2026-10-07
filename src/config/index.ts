import dotenv from 'dotenv';

dotenv.config();

function getEnvString(key: string, defaultValue: string = ''): string {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    return defaultValue;
  }
  return val.trim();
}

export const config = {
  port: parseInt(getEnvString('PORT', '3001'), 10),
  nodeEnv: getEnvString('NODE_ENV', 'development'),
  timezone: getEnvString('TIMEZONE', 'Asia/Kolkata'),
  databaseUrl: getEnvString('DATABASE_URL', 'file:./dev.db'),
  
  // Monitoring & Scheduled Execution Settings
  pollIntervalHours: parseInt(getEnvString('POLL_INTERVAL_HOURS', '2'), 10),
  checkIntervalSeconds: parseInt(getEnvString('CHECK_INTERVAL_SECONDS', '300'), 10),
  minRelevanceScore: getEnvString('MIN_RELEVANCE_SCORE', 'MEDIUM'),
  
  // Telegram Bot Secrets (REQUIRED IN PRODUCTION)
  telegramBotToken: getEnvString('TELEGRAM_BOT_TOKEN', ''),
  telegramChatId: getEnvString('TELEGRAM_CHAT_ID', ''),

  // Email Alert Configuration (Resend)
  emailTo: getEnvString('EMAIL_TO', 'vivekdandotiya772@gmail.com'),
  resendApiKey: getEnvString('RESEND_API_KEY', ''),
  emailFrom: getEnvString('EMAIL_FROM', 'Instagram Job Alert <onboarding@resend.dev>'),
  
  // AI Classifier Configuration (OPTIONAL)
  aiProvider: getEnvString('AI_PROVIDER', 'openai'),
  aiModel: getEnvString('AI_MODEL', 'gpt-4o-mini'),
  aiApiKey: getEnvString('AI_API_KEY', ''),
  
  // OCR Feature Flag
  ocrEnabled: process.env.OCR_ENABLED !== 'false',
  
  // Instagram Access Mode Choices: apify | instaloader | rapidapi | graph_api | scraper | mock
  // DEFAULTS TO 'apify' IN PRODUCTION
  instagramAdapterMode: getEnvString('INSTAGRAM_ADAPTER_MODE', 'apify'),
  apifyApiToken: getEnvString('APIFY_API_TOKEN', ''),
  apifyActorId: getEnvString('APIFY_ACTOR_ID', 'apify~instagram-scraper'),
  rapidApiKey: getEnvString('RAPIDAPI_KEY', ''),
  rapidApiHost: getEnvString('RAPIDAPI_HOST', 'instagram-bulk-scraper-latest.p.rapidapi.com'),
  instagramGraphApiToken: getEnvString('INSTAGRAM_GRAPH_API_TOKEN', ''),
  instagramScraperGateway: getEnvString('INSTAGRAM_SCRAPER_GATEWAY', '')
};
