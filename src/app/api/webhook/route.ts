import { webhookCallback } from "grammy";
import { bot } from "@/lib/bot";

const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(req: Request) {
  return handleUpdate(req);
}

export const dynamic = "force-dynamic";
