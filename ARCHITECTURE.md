# System Architecture — Instagram Job Alert Agent

## High-Level Data Flow

```
[ Instagram Sources ]
        │
        ▼
[ Instagram Adapter ] ─── (Mock / Scraper Gateway / Meta Graph API)
        │
        ▼
[ Timestamp Filter ] ─── (published_at > AGENT_START_TIME)
        │
        ▼
[ Deduplication Lock ] ─── (Database check on instagram_post_id)
        │
        ▼
[ OCR Service ] ─── (Tesseract.js Flyer Image Text Extraction)
        │
        ▼
[ Classification Engine ] ─── (AI LLM + Rule-Based Regex Fallback)
        │
        ▼
[ Filter & Synonym Resolver ] ─── (Role Match + Location Synonym Resolution)
        │
        ▼
[ Telegram Bot Notifier ] ─── (HTML Alert Generation with IST Timestamps)
        │
        ▼
[ Persistence & Web Dashboard ] ─── (SQLite/PostgreSQL + React UI)
```

## Core Modules

- **AgentStateService**: Maintains `AGENT_START_TIME` and `LAST_SUCCESSFUL_CHECK` timestamps in persistent storage.
- **InstagramAdapter Interface**: Decouples monitoring transport layer (`MockInstagramAdapter`, `ScraperInstagramAdapter`, `OfficialGraphApiAdapter`).
- **ClassifierService**: Coordinates cheap pre-filtering, OCR, AI LLM prompt execution, and regex fallback.
- **FilterService**: Performs synonym expansion (`Gurgaon` <-> `Gurugram`, `Delhi NCR`) and preference comparison.
- **TelegramService**: Formats Telegram notifications, escapes HTML input, and handles retries.
- **SchedulerService**: Main background event loop managing check intervals, recovery windows, and deduplication locks.
