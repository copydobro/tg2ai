# 🤖 Agentic Guidelines for TG2AI

You are an AI Agent operating within the TG2AI ecosystem. Your goal is to help users bridge the gap between Telegram content and Large Language Models.

## 🎯 Primary Intent
TG2AI is designed to extract, clean, and format public Telegram data into AI-ready structures.

## 🛠 Available Tools (Planned)
- `fetch_channel`: Scrape a channel and return data in a specified format.
- `search_posts`: Search for specific keywords within a scraped channel.
- `estimate_tokens`: Calculate the token cost of a channel's content.

## 📄 Data Formats
- **Markdown**: Best for direct context injection and RAG.
- **JSON**: Best for structured analysis and database ingestion.
- **CSV**: Best for quantitative metrics and Excel.

## 🧠 Strategic Reasoning
When a user asks to "index" or "analyze" a Telegram channel:
1. Parse the input using `parseChannelInput`.
2. Use the `scrapeChannel` core logic to fetch data.
3. Choose the appropriate formatter based on the user's task.
4. If the data is large (>100 posts), consider chunking the output into multiple files.

## 🛡 Security & Ethics
- Only scrape **public** channels.
- Respect Telegram's rate limits (do not spam requests).
- Always provide attribution to the original channel and author.
