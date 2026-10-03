import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { formatShortIST } from '../utils/date.js';

export interface TelegramNotificationPayload {
  company: string;
  role: string;
  location: string;
  experience: string;
  salary: string;
  workMode: string;
  employmentType: string;
  publishedAt: Date;
  detectedAt: Date;
  relevanceScore: string;
  sourceAccount: string;
  postUrl: string;
  applicationLink: string;
}

export class TelegramService {
  /**
   * Format message in Telegram HTML layout (Requirement 18)
   */
  public static buildAlertMessage(payload: TelegramNotificationPayload): string {
    const applyText = payload.applicationLink && payload.applicationLink !== 'Not specified'
      ? `<a href="${payload.applicationLink}">Apply Here</a>`
      : 'Link in bio / Not specified';

    return `🔔 <b>NEW JOB ALERT</b>

🏢 <b>Company:</b> ${escapeHtml(payload.company)}
💼 <b>Role:</b> ${escapeHtml(payload.role)}
📍 <b>Location:</b> ${escapeHtml(payload.location)}
🎓 <b>Experience:</b> ${escapeHtml(payload.experience)}
💰 <b>Salary:</b> ${escapeHtml(payload.salary)}
🏠 <b>Work Mode:</b> ${escapeHtml(payload.workMode)}
🧑‍💻 <b>Employment:</b> ${escapeHtml(payload.employmentType)}

📅 <b>Posted:</b> ${formatShortIST(payload.publishedAt)} IST
⏱ <b>Detected:</b> ${formatShortIST(payload.detectedAt)} IST
⭐ <b>Relevance:</b> ${payload.relevanceScore}

📌 <b>Source:</b> ${escapeHtml(payload.sourceAccount)}
🔗 <b>Instagram:</b> <a href="${payload.postUrl}">Open Post</a>
🔗 <b>Apply:</b> ${applyText}`;
  }

  /**
   * Send notification via Telegram Bot API with retry mechanism
   */
  public static async sendAlert(payload: TelegramNotificationPayload): Promise<boolean> {
    if (!config.telegramBotToken || !config.telegramChatId) {
      logger.warn('[TELEGRAM SERVICE] Bot Token or Chat ID not configured. Notification skipped (logged to console).');
      logger.info(`[TELEGRAM MOCK ALERT]\n${TelegramService.buildAlertMessage(payload)}`);
      return false;
    }

    const messageHtml = TelegramService.buildAlertMessage(payload);
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, {
          chat_id: config.telegramChatId,
          text: messageHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        }, { timeout: 10000 });

        logger.info(`[TELEGRAM SERVICE] Notification sent successfully for post ${payload.postUrl}`);
        return true;
      } catch (error: any) {
        logger.error(`[TELEGRAM SERVICE] Attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) {
          return false;
        }
        await new Promise(res => setTimeout(res, 2000 * attempt));
      }
    }
    return false;
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
