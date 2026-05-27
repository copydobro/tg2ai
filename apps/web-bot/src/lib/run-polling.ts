import { bot } from "./bot";

console.log("🧹 Clearing any existing webhook...");
bot.api
  .deleteWebhook()
  .then(() => {
    console.log("🤖 Starting TG2AI Bot in Long Polling mode...");
    console.log("Press Ctrl+C to stop.");

    bot.catch((err) => {
      console.error("Bot error occurred:", err);
    });

    bot.start().then(() => {
      console.log("Bot stopped.");
    });
  })
  .catch((err) => {
    console.error("Failed to delete webhook:", err);
  });
