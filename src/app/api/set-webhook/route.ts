import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!token || !webhookUrl) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN and WEBHOOK_URL must be set" },
      { status: 500 },
    );
  }

  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}/api/webhook`;

  const resp = await fetch(url);
  const data = await resp.json();

  return NextResponse.json(data);
}

export const dynamic = "force-dynamic";
