# Instagram Scraper Adapter Specification & API Contract

This document details the exact JSON contract expected by `ScraperInstagramAdapter` when `INSTAGRAM_ADAPTER_MODE=scraper`.

---

## 📡 HTTP Request Format

When monitoring a target account (e.g. `@tech_jobs_india`), the agent sends an HTTP `GET` request to your gateway URL:

```http
GET {INSTAGRAM_SCRAPER_GATEWAY}/user/{username}/posts HTTP/1.1
Host: your-scraper-gateway.com
User-Agent: InstagramJobAgent/1.0
Accept: application/json
```

### Path Parameters
- `{username}`: Clean Instagram handle without `@` symbol (e.g., `tech_jobs_india`).

---

## 📦 Expected JSON Response Schema

Your gateway service must return a JSON response containing an array of posts. The gateway may return either a root JSON array or an object containing a `posts` / `items` / `data` key.

### Standard Supported JSON Payload Structure

```json
{
  "account": "@tech_jobs_india",
  "status": "success",
  "posts": [
    {
      "id": "C_REEL_01",
      "url": "https://www.instagram.com/reel/C_REEL_01/",
      "type": "reel",
      "caption": "🚨 Hiring Alert! ABC Technologies is hiring Full Stack Developers in Noida. Freshers apply now!",
      "media_url": "https://cdn.example.com/flyer_image.jpg",
      "published_at": "2026-10-03T12:35:00.000Z"
    },
    {
      "id": "C_JOB_02",
      "url": "https://www.instagram.com/p/C_JOB_02/",
      "type": "post",
      "caption": "Walk-in interview for Customer Support Executives in Gurugram on Saturday. Freshers welcome!",
      "media_url": "https://cdn.example.com/banner_image.jpg",
      "published_at": "2026-10-03T12:40:00.000Z"
    }
  ]
}
```

---

## 📋 Field Mapping Summary

| Field | Required / Optional | Supported Property Names in Response | Parsing Logic |
|---|---|---|---|
| **Post Identifier** | Required | `id`, `code`, `shortcode` | Uniquely identifies the post for database deduplication lock. |
| **Post URL** | Required | `url`, `permalink`, `code` | Link to the original Instagram post/Reel attached to Telegram notifications. |
| **Post Type** | Required | `type`, `media_type`, `is_reel` | Values containing `"reel"` or `is_reel: true` indicate a Reel; otherwise classified as `POST`. |
| **Caption** | Required | `caption` (string), `caption.text` (object), `text` | Source text for AI and keyword job classification. |
| **Media / Flyer Image URL** | Optional | `media_url`, `image_url`, `image_versions2.candidates[0].url` | Image flyer passed to `Tesseract.js` OCR for embedded text extraction. |
| **Publication Timestamp** | Required | `published_at` (ISO string), `taken_at` (epoch seconds), `timestamp` (ms) | Compared against `AGENT_START_TIME`. Posts with `published_at <= AGENT_START_TIME` are IGNORED. |
