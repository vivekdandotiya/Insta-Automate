import { Resend } from 'resend';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { formatShortIST } from '../utils/date.js';
import { TelegramNotificationPayload } from './telegram.service.js';

export interface EmailNotificationPayload extends TelegramNotificationPayload {}

export class EmailNotificationService {
  /**
   * Format email subject: 🚨 New Job Alert: {Role} | {Location}
   */
  public static buildSubject(payload: EmailNotificationPayload): string {
    const role = payload.role && payload.role !== 'Not specified' ? payload.role : 'Job Opportunity';
    const loc = payload.location && payload.location !== 'Not specified' ? payload.location : 'Flexible';
    return `🚨 New Job Alert: ${role} | ${loc}`;
  }

  /**
   * Format responsive HTML email body suitable for desktop and mobile devices
   */
  public static buildHtmlBody(payload: EmailNotificationPayload): string {
    const applyLinkHtml = payload.applicationLink && payload.applicationLink !== 'Not specified'
      ? `<a href="${escapeHtml(payload.applicationLink)}" style="display: inline-block; padding: 10px 18px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 8px;">Apply Now</a>`
      : '';

    const postLinkHtml = `<a href="${escapeHtml(payload.postUrl)}" style="display: inline-block; padding: 10px 18px; background-color: #4b5563; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Instagram Post</a>`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #1e293b; color: #ffffff; padding: 20px 24px; text-align: left;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">🔔 NEW JOB ALERT</h2>
      <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Automated Job Agent Notification</p>
    </div>
    
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 130px; font-weight: 600;">💼 Role:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 15px; font-weight: 700;">${escapeHtml(payload.role)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">🏢 Company:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.company)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">📍 Location:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.location)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">🎓 Experience:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.experience)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">💰 Salary:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.salary)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">🏠 Work Mode:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.workMode)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">🧑‍💻 Employment:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.employmentType)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">⭐ Relevance:</td>
          <td style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 700;">${escapeHtml(payload.relevanceScore)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">📌 Source:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(payload.sourceAccount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">📅 Posted:</td>
          <td style="padding: 8px 0; color: #374151; font-size: 13px;">${formatShortIST(payload.publishedAt)} IST</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">⏱ Detected:</td>
          <td style="padding: 8px 0; color: #374151; font-size: 13px;">${formatShortIST(payload.detectedAt)} IST</td>
        </tr>
      </table>

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: left;">
        ${applyLinkHtml}
        ${postLinkHtml}
      </div>
    </div>
    
    <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
      Sent automatically by Instagram Job Alert Agent to ${escapeHtml(config.emailTo)}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Send email alert using Resend API with retry mechanism
   */
  public static async sendAlert(payload: EmailNotificationPayload): Promise<boolean> {
    const apiKey = config.resendApiKey || process.env.RESEND_API_KEY || '';
    if (!apiKey.trim()) {
      logger.warn('[EMAIL SERVICE] RESEND_API_KEY environment variable is not configured. Email notification skipped (logged to console).');
      logger.info(`[EMAIL MOCK ALERT]\nTo: ${config.emailTo}\nSubject: ${EmailNotificationService.buildSubject(payload)}`);
      return false;
    }

    const recipient = config.emailTo || 'vivekdandotiya772@gmail.com';
    const sender = config.emailFrom || 'Instagram Job Alert <onboarding@resend.dev>';
    const subject = EmailNotificationService.buildSubject(payload);
    const html = EmailNotificationService.buildHtmlBody(payload);

    const resend = new Resend(apiKey.trim());

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await resend.emails.send({
          from: sender,
          to: [recipient],
          subject,
          html
        });

        if (error) {
          logger.error(`[EMAIL SERVICE] Resend API error on attempt ${attempt}: ${error.message}`);
          if (attempt === maxRetries) {
            return false;
          }
          await new Promise(res => setTimeout(res, 2000 * attempt));
          continue;
        }

        logger.info(`[EMAIL SERVICE] Email alert sent successfully to ${recipient} for post ${payload.postUrl} (ID: ${data?.id || 'OK'})`);
        return true;
      } catch (err: any) {
        logger.error(`[EMAIL SERVICE] Attempt ${attempt} failed: ${err.message}`);
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
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
