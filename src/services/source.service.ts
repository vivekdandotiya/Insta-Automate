import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { getMonitoredInstagramAccounts } from '../config/sources.config.js';

export class SourceService {
  /**
   * Synchronize configured monitored Instagram accounts with the database.
   * Ensures all accounts in MONITORED_INSTAGRAM_ACCOUNTS are present in the DB,
   * preserving existing status, enabled flags, and last_checked_at timestamps.
   */
  public static async syncMonitoredSources(): Promise<number> {
    const accounts = getMonitoredInstagramAccounts();

    for (const rawUsername of accounts) {
      const cleanName = rawUsername.replace(/^@/, '').trim();
      const username = `@${cleanName}`;
      const profile_url = `https://www.instagram.com/${cleanName}/`;

      try {
        await prisma.instagramSource.upsert({
          where: { username },
          update: {}, // Retain existing properties if already created
          create: {
            username,
            profile_url,
            priority: 'NORMAL',
            enabled: true
          }
        });
      } catch (err: any) {
        logger.error(`[SOURCE SERVICE] Failed to sync account ${username}: ${err.message}`);
      }
    }

    const totalActive = await prisma.instagramSource.count({ where: { enabled: true } });
    logger.info(`[INSTAGRAM SOURCES] Monitoring ${totalActive} configured accounts`);
    return totalActive;
  }
}
