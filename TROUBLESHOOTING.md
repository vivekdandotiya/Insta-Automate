# Troubleshooting Guide

### 1. Telegram Alerts Not Delivering
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`.
- Ensure you have started a conversation with your Telegram bot (`/start`).
- Use the **Manual Sandbox -> Send Test Telegram Alert** button in the dashboard to diagnose connection.

### 2. Instagram Feed Empty
- Check `INSTAGRAM_ADAPTER_MODE` setting in `.env`.
- Default `mock` mode generates realistic posts for local testing.
- If using `scraper` mode, ensure the external gateway URL is reachable.

### 3. Database Locked or Permission Errors
- Ensure `.env` points to `file:./dev.db` or valid PostgreSQL connection string.
- Re-run `npx prisma db push`.
