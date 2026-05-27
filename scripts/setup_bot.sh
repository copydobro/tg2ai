#!/bin/bash
# TG2AI Setup Script

echo "🤖 Setting up TG2AI Environment..."

if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp apps/web-bot/.env.example .env
  echo "⚠️  Please update .env with your TELEGRAM_BOT_TOKEN"
fi

echo "📦 Installing dependencies with Bun..."
bun install

echo "✅ Setup complete! Use 'bun run dev:bot' to start the local development server."
