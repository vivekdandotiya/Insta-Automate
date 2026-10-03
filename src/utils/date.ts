import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Format date into IST display string (e.g., '03 Oct 2026, 12:45 PM IST')
 */
export function formatIST(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return formatInTimeZone(d, TIMEZONE, 'dd MMM yyyy, hh:mm:ss a zzz');
}

/**
 * Short formatted IST date
 */
export function formatShortIST(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return formatInTimeZone(d, TIMEZONE, 'dd MMM yyyy, hh:mm a');
}

/**
 * Convert Date to IST Zoned object
 */
export function getZonedTime(date: Date = new Date()): Date {
  return toZonedTime(date, TIMEZONE);
}

/**
 * Determine if a post is eligible based on strict publication timestamp rules:
 * published_at > AGENT_START_TIME
 */
export function isPostAfterStartTime(publishedAt: Date | string, agentStartTime: Date | string): boolean {
  const pubDate = new Date(publishedAt).getTime();
  const startDate = new Date(agentStartTime).getTime();
  if (isNaN(pubDate) || isNaN(startDate)) return false;
  return pubDate > startDate;
}
