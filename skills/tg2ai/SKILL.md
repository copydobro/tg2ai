---
name: tg2ai
description: Export public Telegram channels to AI-ready formats (Markdown, JSON, CSV). Supports token estimation, data cleaning, and structured extraction for RAG and LLM context.
---

# 🤖 TG2AI Skill

This skill allows you to extract data from any public Telegram channel directly into your workspace.

## Installation

```bash
npx skills add https://github.com/copydobro/tg2ai/tree/main/skills/tg2ai
```

## Tools

### `fetch_telegram_channel`
Scrapes a channel and saves it to a file.

**Parameters:**
- `channel`: Channel username (e.g., `@durov`) or link.
- `format`: `md`, `json`, or `csv` (default: `md`).
- `limit`: Number of posts to fetch (default: 100).

## Usage Examples

- "Fetch the last 50 posts from @durov as markdown"
- "Convert https://t.me/telegram to a JSON file for my RAG base"
- "Get a CSV of recent posts from @nextjs_en"

## Local Runtime

The skill uses the `@tg2ai/mcp` server. You can run it manually:

```bash
bun run --filter @tg2ai/mcp start
```
