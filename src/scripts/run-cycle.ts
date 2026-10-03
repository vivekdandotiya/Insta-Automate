import dotenv from 'dotenv';
dotenv.config();

import { connectDb } from '../db/client.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('=====================================================');
  logger.info('   EXECUTING SINGLE SCHEDULED INSTAGRAM CHECK CYCLE  ');
  logger.info('=====================================================');

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
    logger.error('Scheduled cycle finished with configuration or connection error.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  logger.error('Fatal failure in scheduled run-cycle:', err);
  process.exit(1);
});
