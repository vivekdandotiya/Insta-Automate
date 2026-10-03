# 🆓 Zero-Cost (€0 / ₹0 per Month) Scheduled Deployment Guide

This guide details how to deploy the **Instagram Job Alert Agent** for **100% Free** using GitHub Actions Scheduled Workflows.

---

## 🎯 Architecture Summary

- **Execution Model**: Single-run CLI worker (`npm run run-cycle`) executing every **2 hours** via GitHub Actions scheduled cron (`0 */2 * * *`).
- **State & Checkpoint**: `AGENT_START_TIME` and `LAST_SUCCESSFUL_CHECK` are stored in database storage.
- **Cost**: **₹0 / $0 per month**. Uses free-tier GitHub Actions minutes (2,000 free minutes/month) and free-tier Apify credits ($5.00/month credit).

---

## 🚀 Step-by-Step GitHub Actions Setup Guide

### Step 1: Push Project Repository to GitHub
Create a private or public GitHub repository and push your project:
```bash
git init
git add .
git commit -m "Deploy Instagram Job Alert Agent"
git remote add origin https://github.com/your-username/instagram-job-agent.git
git push -u origin main
```

### Step 2: Configure GitHub Repository Secrets
In your GitHub repository, navigate to:  
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`.

Add the following required secrets:

| Secret Name | Description / Value | Required? |
|---|---|---|
| `APIFY_API_TOKEN` | Token from [Apify Console](https://console.apify.com/account/integrations) | **Yes** |
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) | **Yes** |
| `TELEGRAM_CHAT_ID` | Your Chat ID from [@userinfobot](https://t.me/userinfobot) | **Yes** |
| `INSTAGRAM_ADAPTER_MODE` | Set to `apify` | Optional (default: `apify`) |
| `POLL_INTERVAL_HOURS` | Set to `2` | Optional (default: `2`) |
| `AI_API_KEY` | OpenAI or Gemini Key (If unset, offline regex engine runs) | Optional |
| `DATABASE_URL` | PostgreSQL connection string (e.g., free [Neon.tech](https://neon.tech) / [Supabase](https://supabase.com)) | Optional (defaults to file db) |

---

## ⏰ Schedule & Downtime Recovery Behavior

- **Scheduled Cron Trigger**: `0 */2 * * *` (Runs every 2 hours).
- **Delay Buffer Handling**: GitHub Actions cron triggers may experience variable platform delays (e.g. executing at 2:07 PM instead of 2:00 PM). The application relies on `LAST_SUCCESSFUL_CHECK` rather than assuming exact 2-hour increments, ensuring **ZERO missed posts**.
- **Missed Execution Recovery**: If a scheduled execution is delayed or skipped, the next execution calculates the effective recovery window from `LAST_SUCCESSFUL_CHECK` up to current execution time.

---

## 🛠️ Manual Execution & Reset

### How to Trigger a Manual Run Now from GitHub
1. Go to your GitHub repository → **Actions** tab.
2. Click **Scheduled Instagram Job Alert Worker** on the left menu.
3. Click **Run workflow** dropdown → Click **Run workflow**.

### How to Reset `AGENT_START_TIME`
If you wish to establish a new start timestamp, trigger the admin endpoint or run locally:
```bash
npm run run-cycle -- --reset-start-time
```
