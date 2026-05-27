---
name: tg2ai
description: Export public Telegram channels to AI-ready formats (Markdown, JSON, CSV, TOON). Supports token estimation, automatic file chunking (50k tokens), and structured extraction for RAG and LLM context.
---

# 🤖 TG2AI Skill

TG2AI provides powerful tools for AI agents to fetch, index, and analyze content from public Telegram channels.

## Quick Installation

```bash
npx skills add https://github.com/copydobro/tg2ai/tree/main/skills/tg2ai
```

After installation, your agent (Claude Code, Gemini CLI, etc.) will have access to the following tools.

## 🛠 Available Tools

### `fetch_telegram_channel`
Scrapes a public Telegram channel and returns the content. Automatically handles large channels by splitting data into chunks (max 50,000 tokens per chunk).

**Arguments:**
- `channel` (string, required): The channel username (e.g., `@durov`) or a full Telegram link.
- `limit` (number, optional): Maximum number of posts to fetch. Default is **1000**.
- `format` (string, optional): One of `md`, `json`, `csv`, `toon`. Default is `md`.

## 📖 Usage Examples

Tell your agent:
- "Fetch the last 300 posts from @durov as markdown and save them to my workspace."
- "Index https://t.me/junior_pm into TOON format for context."
- "Get a CSV of recent Telegram posts from @nextjs_en."

## 🚀 Technical Integration (MCP)

This skill includes an **MCP (Model Context Protocol)** server. Agents can use it to "read" Telegram like a local file system.

### Manual Server Start
```bash
bun run --filter @tg2ai/mcp start
```

### Agent Configuration (mcp_config.json)
```json
{
  "mcpServers": {
    "tg2ai": {
      "command": "bun",
      "args": ["run", "--filter", "@tg2ai/mcp", "start"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "your_token_here"
      }
    }
  }
}
```

## 🛡 Security & Ethics
- Only scrapes **public** data via web previews.
- Does not require a user account or phone number.
- Respects Telegram's terms of service and rate limits.
