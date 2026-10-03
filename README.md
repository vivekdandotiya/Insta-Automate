# 🚀 Instagram Job Alert Agent

An autonomous, production-ready AI Agent that continuously monitors Instagram accounts/sources for job postings, walk-in interviews, hiring alerts, and vacancies published after a persisted `AGENT_START_TIME`. 

It classifies jobs using AI (or high-precision rule fallback), extracts structured job fields (role, company, location, experience, salary, application link), normalizes location variations (e.g. Gurgaon <-> Gurugram, Delhi NCR), prevents duplicates, and sends instant HTML-formatted alerts to Telegram.

---

## 🌟 Supported Instagram Data Providers

1. **Apify Instagram Scraper API (`INSTAGRAM_ADAPTER_MODE=apify`) [RECOMMENDED]**:
   - Official Docs: [https://apify.com/apify/instagram-scraper](https://apify.com/apify/instagram-scraper)
   - Supports arbitrary public Instagram accounts and Reels.
   - Requires `APIFY_API_TOKEN` in `.env`.

2. **RapidAPI Instagram Data API (`INSTAGRAM_ADAPTER_MODE=rapidapi`)**:
   - RapidAPI endpoints for fetching profile posts.
   - Requires `RAPIDAPI_KEY` and `RAPIDAPI_HOST` in `.env`.

3. **Meta Graph API (`INSTAGRAM_ADAPTER_MODE=graph_api`)**:
   - Official Meta Graph API for Instagram Business/Creator accounts.
   - Requires `INSTAGRAM_GRAPH_API_TOKEN` in `.env`.

4. **Custom Scraper Gateway (`INSTAGRAM_ADAPTER_MODE=scraper`)**:
   - Any self-hosted HTTP scraper gateway following [`INSTAGRAM_ADAPTER_CONTRACT.md`](file:///c:/Users/HP/OneDrive/Desktop/Agent1/INSTAGRAM_ADAPTER_CONTRACT.md).

5. **Local Mock Engine (`INSTAGRAM_ADAPTER_MODE=mock`)**:
   - Built-in test dataset for zero-token local development.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Push Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 3. Run Diagnostic Connectivity Test
```bash
npm run test:instagram
```

### 4. Start Development Server
```bash
# Terminal 1: Backend API (Port 3001)
npm run dev:backend

# Terminal 2: React Dashboard (Port 3000)
npm run dev:frontend
```

---

## 🐳 Docker Deployment

Run the complete dockerized application with a single command:
```bash
docker compose up -d
```
Access dashboard at `http://localhost:3001`.

---

## 🧪 Running Automated Tests

Run the full Vitest suite testing timestamp cutoff logic, deduplication, location matching, and classifiers:
```bash
npm test
```
