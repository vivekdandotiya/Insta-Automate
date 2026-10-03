# Setup Guide — Instagram Job Alert Agent

## Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- Git

## Step 1: Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```ini
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
TELEGRAM_CHAT_ID="your_telegram_chat_id"
AI_API_KEY="optional_openai_or_gemini_key"
```

## Step 2: Database Initialization
```bash
npx prisma generate
npx prisma db push
```

## Step 3: Run Development Server
```bash
npm run dev:backend
```
In a secondary terminal:
```bash
npm run dev:frontend
```

Open `http://localhost:3000` in your browser.
