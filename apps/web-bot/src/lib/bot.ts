import { Bot, InlineKeyboard, InputFile } from "grammy";
import { scrapeChannel, parseChannelInput, formatExport, type FormatType } from "@tg2ai/core";

// ---------------------------------------------------------------------------
// Bot instance (re-created per invocation in serverless — that's fine)
// ---------------------------------------------------------------------------

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token && process.env.NODE_ENV === "production") {
  console.warn("TELEGRAM_BOT_TOKEN is not set. Bot will not function.");
}

export const bot = new Bot(token || "dummy_token");

// ---------------------------------------------------------------------------
// Localization & Translations
// ---------------------------------------------------------------------------

interface BotStrings {
  start: string;
  help: string;
  invalidChannel: string;
  chooseFormat: string;
  exporting: string;
  emptyOrUnavailable: string;
  caption: string;
  completed: string;
  error: string;
  btnMarkdown: string;
  btnJson: string;
  btnCsv: string;
  btnToon: string;
}

const strings: Record<"ru" | "en", BotStrings> = {
  ru: {
    start: `👋 <b>TG2AI</b> — экспорт Telegram-каналов в AI-ready форматы\n\n` +
      `Отправьте мне ссылку на публичный канал:\n` +
      `• <code>https://t.me/durov</code>\n` +
      `• <code>@durov</code>\n` +
      `• <code>durov</code>\n\n` +
      `Я выгружу его в <b>Markdown</b>, <b>JSON</b>, <b>CSV</b> или <b>TOON</b> — ` +
      `оптимизированные для ChatGPT, Claude, RAG и fine-tuning.`,
    help: `📖 <b>Как использовать:</b>\n\n` +
      `1. Отправьте ссылку на канал или @username\n` +
      `2. Выберите формат экспорта\n` +
      `3. Получите готовый файл для AI\n\n` +
      `<b>Форматы:</b>\n` +
      `📄 <b>Markdown</b> — для ChatGPT / Claude / Obsidian\n` +
      `📋 <b>JSON</b> — для RAG / fine-tuning / разработки\n` +
      `📊 <b>CSV</b> — для таблиц / Excel\n` +
      `🚀 <b>TOON</b> — экстра-сжатый формат для AI\n\n` +
      `Бот экспортирует до 1000 последних постов из публичных каналов.`,
    invalidChannel: `❌ Не могу распознать канал.\n\nОтправьте ссылку вида <code>@durov</code> или <code>https://t.me/durov</code>`,
    chooseFormat: `📡 Канал: <b>@{{channel}}</b>\n\nВыберите формат экспорта:`,
    exporting: `⏳ Экспортирую <b>@{{channel}}</b> в <b>{{format}}</b>...\n\nЭто может занять до 30 секунд.`,
    emptyOrUnavailable: `⚠️ Канал <b>@{{channel}}</b> пуст или недоступен.`,
    caption: `✅ <b>@{{channel}}</b>\n` +
      `📝 {{postsCount}} постов | 📦 {{size}} KB\n` +
      `💰 ~{{tokens}} токенов`,
    completed: `✅ Экспорт <b>@{{channel}}</b> → <b>{{format}}</b> завершён.`,
    error: `❌ Ошибка при экспорте <b>@{{channel}}</b>:\n<code>{{msg}}</code>`,
    btnMarkdown: "📄 Markdown",
    btnJson: "📋 JSON",
    btnCsv: "📊 CSV",
    btnToon: "🚀 TOON"
  },
  en: {
    start: `👋 <b>TG2AI</b> — export Telegram channels to AI-ready formats\n\n` +
      `Send me a link to a public channel:\n` +
      `• <code>https://t.me/durov</code>\n` +
      `• <code>@durov</code>\n` +
      `• <code>durov</code>\n\n` +
      `I will export it to <b>Markdown</b>, <b>JSON</b>, <b>CSV</b> or <b>TOON</b> — ` +
      `fully optimized for ChatGPT, Claude, RAG, and fine-tuning.`,
    help: `📖 <b>How to use:</b>\n\n` +
      `1. Send a channel link or @username\n` +
      `2. Choose export format\n` +
      `3. Get your AI-ready file\n\n` +
      `<b>Formats:</b>\n` +
      `📄 <b>Markdown</b> — for ChatGPT / Claude / Obsidian\n` +
      `📋 <b>JSON</b> — for RAG / fine-tuning / development\n` +
      `📊 <b>CSV</b> — for tables / Excel\n` +
      `🚀 <b>TOON</b> — compressed format for AI\n\n` +
      `The bot exports up to 1000 recent posts from public channels.`,
    invalidChannel: `❌ Cannot parse channel.\n\nSend a link like <code>@durov</code> or <code>https://t.me/durov</code>`,
    chooseFormat: `📡 Channel: <b>@{{channel}}</b>\n\nChoose export format:`,
    exporting: `⏳ Exporting <b>@{{channel}}</b> to <b>{{format}}</b>...\n\nThis may take up to 30 seconds.`,
    emptyOrUnavailable: `⚠️ Channel <b>@{{channel}}</b> is empty or unavailable.`,
    caption: `✅ <b>@{{channel}}</b>\n` +
      `📝 {{postsCount}} posts | 📦 {{size}} KB\n` +
      `💰 ~{{tokens}} tokens`,
    completed: `✅ Export of <b>@{{channel}}</b> → <b>{{format}}</b> completed.`,
    error: `❌ Error exporting <b>@{{channel}}</b>:\n<code>{{msg}}</code>`,
    btnMarkdown: "📄 Markdown",
    btnJson: "📋 JSON",
    btnCsv: "📊 CSV",
    btnToon: "🚀 TOON"
  }
};

function getLocale(languageCode?: string): "ru" | "en" {
  if (languageCode && languageCode.toLowerCase().startsWith("ru")) {
    return "ru";
  }
  return "en";
}

// ---------------------------------------------------------------------------
// /start
// ---------------------------------------------------------------------------

bot.command("start", async (ctx) => {
  const lang = getLocale(ctx.from?.language_code);
  await ctx.reply(strings[lang].start, { parse_mode: "HTML" });
});

// ---------------------------------------------------------------------------
// /help
// ---------------------------------------------------------------------------

bot.command("help", async (ctx) => {
  const lang = getLocale(ctx.from?.language_code);
  await ctx.reply(strings[lang].help, { parse_mode: "HTML" });
});

// ---------------------------------------------------------------------------
// Message handler — user sends a channel link
// ---------------------------------------------------------------------------

bot.on("message:text", async (ctx) => {
  const input = ctx.message.text;
  const lang = getLocale(ctx.from?.language_code);

  // Skip commands
  if (input.startsWith("/")) return;

  const channelName = parseChannelInput(input);
  if (!channelName) {
    await ctx.reply(strings[lang].invalidChannel, { parse_mode: "HTML" });
    return;
  }

  // Show format selection
  const t = strings[lang];
  const keyboard = new InlineKeyboard()
    .text(t.btnMarkdown, `fmt:md:${channelName}:${lang}`)
    .text(t.btnJson, `fmt:json:${channelName}:${lang}`)
    .row()
    .text(t.btnCsv, `fmt:csv:${channelName}:${lang}`)
    .text(t.btnToon, `fmt:toon:${channelName}:${lang}`);

  const msg = t.chooseFormat.replace("{{channel}}", channelName);
  await ctx.reply(msg, { parse_mode: "HTML", reply_markup: keyboard });
});

// ---------------------------------------------------------------------------
// Callback handler — user picked a format
// ---------------------------------------------------------------------------

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (!data.startsWith("fmt:")) {
    await ctx.answerCallbackQuery();
    return;
  }

  const parts = data.split(":");
  if (parts.length < 4) {
    await ctx.answerCallbackQuery({ text: "Invalid callback data" });
    return;
  }

  const format = parts[1] as FormatType;
  const channelName = parts[2];
  const lang = (parts[3] || "en") as "ru" | "en";

  const supportedFormats = ["md", "json", "csv", "toon"];
  if (!supportedFormats.includes(format)) {
    await ctx.answerCallbackQuery({ text: "Unknown format" });
    return;
  }

  // Acknowledge the button press
  await ctx.answerCallbackQuery();

  const t = strings[lang];

  // Update the message to show progress
  const exportingMsg = t.exporting
    .replace("{{channel}}", channelName)
    .replace("{{format}}", format.toUpperCase());

  await ctx.editMessageText(exportingMsg, { parse_mode: "HTML" });

  try {
    // Scrape up to 1000 posts
    const result = await scrapeChannel(channelName, 1000);

    if (result.posts.length === 0) {
      const emptyMsg = t.emptyOrUnavailable.replace("{{channel}}", channelName);
      await ctx.editMessageText(emptyMsg, { parse_mode: "HTML" });
      return;
    }

    // Format (can return multiple files if > 50k tokens)
    const files = formatExport(result, format);

    for (const f of files) {
      const buffer = Buffer.from(f.content, "utf-8");
      const file = new InputFile(buffer, f.filename);

      // Calculate stats for each file
      const sizeKB = Math.ceil(buffer.length / 1024);
      const tokens = Math.ceil(f.content.length / 4);

      const captionMsg = t.caption
        .replace("{{channel}}", channelName)
        .replace("{{postsCount}}", String(f.postsInChunk)) // show posts in this specific file
        .replace("{{size}}", String(sizeKB))
        .replace("{{tokens}}", tokens.toLocaleString()) + 
        (f.dateRange ? `\n📅 ${f.dateRange}` : "");

      await ctx.replyWithDocument(file, {
        caption: captionMsg,
        parse_mode: "HTML",
      });
    }

    // Clean up the "exporting..." message
    const completedMsg = t.completed
      .replace("{{channel}}", channelName)
      .replace("{{format}}", format.toUpperCase());

    await ctx.editMessageText(completedMsg, { parse_mode: "HTML" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    const errorMsg = t.error
      .replace("{{channel}}", channelName)
      .replace("{{msg}}", msg);

    await ctx.editMessageText(errorMsg, { parse_mode: "HTML" });
  }
});
