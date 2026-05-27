# 🤖 TG2AI — Telegram-to-AI Data Exporter

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![grammY Framework](https://img.shields.io/badge/Framework-grammY-blue?logo=telegram)](https://grammy.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**TG2AI** is an ultra-minimalist, stateless Telegram bot designed to convert any public Telegram channel into clean, AI-ready data formats (**Markdown**, **JSON**, **CSV**) in less than 10 seconds. 

Perfect for loading expert context into **ChatGPT**, **Claude Projects**, building personal **RAG bases**, or preparing custom datasets for **LLM fine-tuning**.

> 🇷🇺 *Бот полностью поддерживает русский язык! Если язык вашего интерфейса Telegram русский, бот автоматически переключится на него.*

---

## 🛑 The Pain: Why not standard Telegram Export?

When you export chat history using the native Telegram Desktop client, you get cluttered HTML or verbose JSON files. 
* **Bloated Context:** Up to 90% of the export consists of service code, system styles, and HTML noise. Feeding this directly to Claude or ChatGPT blows up your context window and burns your token budget.
* **No Markdown Structure:** Standard exports do not organize posts cleanly for LLM consumption, making note-taking systems like Obsidian difficult to build.

**The TG2AI Solution:**
It scrapes, cleanses, formats, and estimates tokens in 10 seconds. You get clean text, structured code, and active links.

---

## 🎯 Key Use Cases & Formats

### 1. 📄 Markdown (.md) — Best for LLM Context & Obsidian
* **YAML Frontmatter:** Includes channel title, subscribers, timestamp, and a *rough token count estimate* to help manage your API costs.
* **RAG-Ready:** Converts Telegram HTML tags (bold, italic, links, code blocks) to standard Markdown. Posts are grouped chronologically by date.

### 2. 📋 JSON (.json) — Best for Vector DB Ingestion
* Fully structured array of posts containing clean plain text, original markdown structure, views, timestamp, and direct links. Ready to be loaded into Pinecone, ChromaDB, or converted to JSONL for fine-tuning.

### 3. 📊 CSV (.csv) — Best for Excel & Quantitative Analysis
* Clean table containing fields like views, dates, and text (with secure line breaks escaping). Great for monitoring competitor channels and growth analytics.

---

## 🚀 Deployment in 3 Steps (Vercel Hobby Free Tier)

This project is designed to run completely stateless and fit comfortably within the Vercel Hobby Free Tier (serverless execution).

### 1. Clone & Push to GitHub
Create a private or public repository on GitHub, commit your code, and push:
```bash
git clone https://github.com/your-username/tg2ai.git
cd tg2ai
npm install
```

### 2. Setup Vercel Environment Variables
Import the project into Vercel and add the following **Environment Variables**:
* `TELEGRAM_BOT_TOKEN`: Your bot token from `@BotFather`.
* `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`: The username of your bot (e.g., `tg2aiibot`).
* `WEBHOOK_URL`: Your Vercel deployment URL (e.g., `https://your-project.vercel.app`).

### 3. Set Webhook
Once deployed, open your browser and navigate to:
`https://your-project.vercel.app/api/set-webhook`

You will see: `{"ok":true,"result":true,"description":"Webhook was set"}`. Your bot is live!

---

## 🛠️ Local Development & Polling Mode

For fast local testing without setting up tunnels or webhooks:

1. Create a `.env` file in the root directory:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
   ```
2. Start the bot in long-polling mode (it will automatically clear any active webhook for local testing):
   ```bash
   npm run dev      # Runs next dev server
   npx tsx --env-file=.env src/lib/run-polling.ts  # Runs bot listener
   ```

---

## 🤝 Contributing & Wrapping into a "Skill"

We want to make TG2AI the ultimate bridge between Telegram and AI coding agents. 

If you are using agentic coding helpers (like **Antigravity**, **Claude Code**, or **Cline**), we are wrapping this utility into a reusable **Agentic Skill**. This will allow any AI coder to automatically fetch and index Telegram channels directly into a workspace via a simple slash command.

Feel free to open issues, submit Pull Requests, and help us make this tool better!

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
