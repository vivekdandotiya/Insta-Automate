# 🚀 Instagram Job Alert Dashboard (Insta-Automate)

An autonomous, web-based **Instagram Job Alert Dashboard** that continuously monitors 69 public Instagram accounts for job postings, walk-in interviews, hiring alerts, internships, and vacancies published after a persisted `AGENT_START_TIME`.

It classifies jobs using high-precision rule and AI classifiers, extracts structured job fields (role, company, location, experience, salary, work mode, employment type, application link), normalizes location variations (e.g. Gurgaon <-> Gurugram, Delhi NCR, Ghaziabad, Faridabad), prevents duplicates using canonical Instagram post IDs, and displays day-wise job feeds on a modern web dashboard.

---

## 🌟 Key Features

- **Web Dashboard as Primary Destination**: All qualifying job posts are stored in PostgreSQL / Supabase and presented on the web dashboard organized by day (`Asia/Kolkata` IST timezone).
- **69 Monitored Instagram Accounts**: Monitors public Instagram profiles every 2 hours via Apify Instagram Scraper (`apify~instagram-scraper`).
- **Atomic Duplicate Protection**: Guarantees zero duplicate job records using a database `UNIQUE` constraint on `instagram_post_id`.
- **Persistent `AGENT_START_TIME`**: Ignore pre-start posts automatically without ever resetting the monitoring cutoff timestamp.
- **Day-Wise History Navigation**: View Today's jobs or navigate historical days via date pickers and history logs without destroying historical database data.
- **Global Search & Multi-Filter Controls**: Search by role, company, location, caption, or username; filter by relevance (`HIGH`, `MEDIUM`, `LOW`), work mode, employment type, or source account.
- **Manual Scan ("🚀 SCAN NOW")**: Server-side endpoint triggers immediate execution cycles without bypassing deduplication or resetting start times.
- **Automated 2-Hour Worker**: Scheduled background worker runs automatically on GitHub Actions (`0 */2 * * *`) even when local machines are powered off.
- **Multi-Channel Notifications**: Optional HTML Email (Resend) and Telegram bot notifications run in isolated channels without blocking dashboard insertions.

---

## 🏗 System Architecture

```text
               INSTAGRAM ACCOUNTS (69 Monitored Feeds)
                                 ↓
              APIFY INSTAGRAM SCRAPER (apify~instagram-scraper)
                                 ↓
                    RAW INSTAGRAM POSTS & REELS
                                 ↓
                    JOB DETECTION & CLASSIFICATION
                                 ↓
                      AGENT_START_TIME CUTOFF
                                 ↓
                   CANONICAL POST ID DEDUPLICATION
                                 ↓
                     POSTGRESQL / SUPABASE DB
                                 ↓
              ┌───────────────────────────────────┐
              │    WEB DASHBOARD (React + Vite)   │
              └───────────────────────────────────┘
                                 ↓
        ┌────────────────────────┼────────────────────────┐
        ↓                        ↓                        ↓
      TODAY                  HISTORY                   SEARCH
  (Asia/Kolkata)           (Day-wise)              & MULTI-FILTERS
```

---

## 📡 REST API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/jobs` | `GET` | Paginated day-wise job alerts. Query params: `date` (YYYY-MM-DD), `search`, `role`, `location`, `relevance`, `workMode`, `employmentType`, `sort`, `page`, `limit`. |
| `/api/jobs/stats` | `GET` | Dashboard statistics metrics (today's jobs, new 24h jobs, high relevance, 69 monitored accounts, total scanned, last successful check). |
| `/api/jobs/history` | `GET` | List of historical dates with job counts for day-wise navigation. |
| `/api/jobs/:id` | `GET` | Complete details for a single job post. |
| `/api/jobs/scan` | `POST` | Triggers a manual check cycle (`SchedulerService.executeCheckCycle()`). |
| `/api/agent/status` | `GET` | Current agent state (`RUNNING`/`PAUSED`/`STOPPED`), `AGENT_START_TIME`, and `LAST_SUCCESSFUL_CHECK`. |
| `/api/sources` | `GET` | List of active monitored Instagram sources. |

---

## 🚀 Local Setup & Development

### 1. Install Project Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file in the project root based on `.env.example`:
```env
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
APIFY_API_TOKEN="apify_api_your_token_here"
EMAIL_TO="vivekdandotiya772@gmail.com"
RESEND_API_KEY="re_your_resend_key_here"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
```

### 3. Generate Prisma Client & Push Database Schema
```bash
npx prisma generate --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/schema.prisma
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (Port 3001)
npm run dev:backend

# Terminal 2: React Dashboard (Port 3000)
npm run dev:frontend
```

---

## 🧪 Running Automated Tests

Run the full Vitest suite testing timestamp cutoff logic, source counts (69 accounts), keyword classification, email alerts, deduplication, and location matching:
```bash
npm test
```

---

## ⚙️ Scheduled Production Execution (GitHub Actions)

The repository includes a scheduled production worker in `.github/workflows/job-monitor.yml` running every 2 hours:
- Cron Schedule: `0 */2 * * *`
- Executes preflight checks, synchronizes database schema, retrieves Instagram posts from Apify, and saves qualifying job posts directly to Supabase PostgreSQL for display on the Web Dashboard.
