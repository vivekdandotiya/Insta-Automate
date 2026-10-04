import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Format date into IST display string (e.g., '03 Oct 2026, 12:45:00 PM IST')
 */
export function formatIST(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return formatInTimeZone(d, TIMEZONE, 'dd MMM yyyy, hh:mm:ss a zzz');
}

/**
 * Short formatted IST date (e.g., '03 Oct 2026, 12:45 PM')
 */
export function formatShortIST(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return formatInTimeZone(d, TIMEZONE, 'dd MMM yyyy, hh:mm a');
}

/**
 * Get formatted IST YYYY-MM-DD date string
 */
export function getISTDateString(date: Date | string | number = new Date()): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatInTimeZone(d, TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get readable IST date label (e.g., '04 Oct 2026')
 */
export function getISTDateLabel(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatInTimeZone(d, TIMEZONE, 'dd MMM yyyy');
}

/**
 * Calculate UTC start and end Date objects for a given IST YYYY-MM-DD string
 */
export function getISTDayBounds(dateString: string): { startUtc: Date; endUtc: Date } {
  let dateStr = dateString.trim();
  if (dateStr === 'today' || !dateStr) {
    dateStr = getISTDateString(new Date());
  }

  // YYYY-MM-DD in IST is [YYYY, MM-1, DD, 0, 0, 0] in IST timezone (UTC - 5:30)
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // 00:00:00 IST = (year, month-1, day, 0, 0, 0) - 5h 30m in UTC
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
  const endUtc = new Date(startUtc.getTime() + (24 * 60 * 60 * 1000 - 1));

  return { startUtc, endUtc };
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
