import dotenv from 'dotenv';
dotenv.config();

import { connectDb } from '../db/client.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('=====================================================');
  logger.info('   EXECUTING MANUAL INSTAGRAM CHECK CYCLE           ');
  logger.info('=====================================================');

  logger.info(`[PRODUCTION DIAGNOSTIC] Adapter Mode:        ${config.instagramAdapterMode.toUpperCase()}`);
  logger.info(`[PRODUCTION DIAGNOSTIC] Database URL:        ${config.databaseUrl ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  logger.info('-----------------------------------------------------');

  await connectDb();

  const result = await SchedulerService.executeCheckCycle();

  logger.info('-----------------------------------------------------');
  logger.info(`Result Summary:`);
  logger.info(`- Duration:            ${result.duration} ms`);
  logger.info(`- Sources Checked:     ${result.sourcesChecked} / ${result.sourcesConfigured}`);
  logger.info(`- Posts Fetched:       ${result.postsFetched}`);
  logger.info(`- New Jobs Found:      ${result.newJobs}`);
  logger.info(`- Duplicates Ignored:  ${result.duplicates}`);
  logger.info(`- Rate Limited:        ${result.rateLimited}`);
  logger.info(`- Errors Encountered:  ${result.errors}`);
  logger.info('=====================================================');

  process.exit(0);
}

main().catch((err) => {
  logger.error('Fatal failure in run-cycle:', err);
  process.exit(1);
});
