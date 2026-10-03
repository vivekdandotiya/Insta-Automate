import dotenv from 'dotenv';
dotenv.config();

import { connectDb } from '../db/client.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('=====================================================');
  logger.info('   EXECUTING SCHEDULED INSTAGRAM CHECK CYCLE        ');
  logger.info('=====================================================');

  // Safe Production Environment Diagnostic (Requirement 19 - Secrets masked)
  logger.info(`[PRODUCTION DIAGNOSTIC] Adapter Mode:        ${config.instagramAdapterMode.toUpperCase()}`);
  logger.info(`[PRODUCTION DIAGNOSTIC] Database URL:        ${config.databaseUrl ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  logger.info(`[PRODUCTION DIAGNOSTIC] APIFY_API_TOKEN:     ${config.apifyApiToken ? `CONFIGURED (Length: ${config.apifyApiToken.length})` : 'NOT CONFIGURED'}`);
  logger.info(`[PRODUCTION DIAGNOSTIC] TELEGRAM_BOT_TOKEN:  ${config.telegramBotToken ? `CONFIGURED (Length: ${config.telegramBotToken.length})` : 'NOT CONFIGURED'}`);
  logger.info(`[PRODUCTION DIAGNOSTIC] TELEGRAM_CHAT_ID:    ${config.telegramChatId ? `CONFIGURED (Length: ${config.telegramChatId.length})` : 'NOT CONFIGURED'}`);
  logger.info(`[PRODUCTION DIAGNOSTIC] AI_API_KEY:          ${config.aiApiKey ? `CONFIGURED (Provider: ${config.aiProvider})` : 'NOT CONFIGURED (Rule Fallback Active)'}`);
  logger.info('-----------------------------------------------------');

  await connectDb();

  const result = await SchedulerService.executeCheckCycle();

  logger.info('-----------------------------------------------------');
  logger.info(`Result Summary:`);
  logger.info(`- Duration:            ${result.durationMs} ms`);
  logger.info(`- Posts Scanned:       ${result.scanned}`);
  logger.info(`- Jobs Processed:      ${result.processed}`);
  logger.info(`- Telegram Alerts Sent: ${result.notified}`);
  logger.info(`- Duplicates Ignored:   ${result.duplicates}`);
  logger.info(`- Errors Encountered:   ${result.errors}`);
  logger.info('=====================================================');

  if (result.errors > 0 && result.scanned === 0) {
    logger.error('Scheduled cycle finished with error. Failing execution step for GitHub Actions visibility.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  logger.error('Fatal failure in scheduled run-cycle:', err);
  process.exit(1);
});
