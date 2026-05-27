import {
  type FormatType,
  createArchive,
  formatExport,
  parseMultipleChannels,
  scrapeChannel,
} from "@tg2ai/core";
import { Bot, InlineKeyboard, InputFile } from "grammy";

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
    start:
      `👋 <b>TG2AI</b> — экспорт Telegram-каналов в AI-ready форматы\n\n` +
      `Отправьте мне ссылку на канал (или <b>несколько каналов через запятую</b>):\n` +
      `• <code>@durov, @telegram</code>\n` +
      `• <code>https://t.me/durov</code>\n\n` +
      `Я выгружу их в <b>Markdown</b>, <b>JSON</b>, <b>CSV</b> или <b>TOON</b> — ` +
      `идеально очищенные и оптимизированные для ChatGPT, Claude и RAG-систем.`,
    help:
      `📖 <b>Как использовать:</b>\n\n` +
      `1. Отправьте имя канала (или <b>несколько каналов через запятую</b>, до 20 штук)\n` +
      `2. Выберите формат экспорта\n` +
      `3. Получите файлы (при пакетном экспорте бот автоматически упакует их в один <b>ZIP-архив</b>)\n\n` +
      `<b>Форматы:</b>\n` +
      `📄 <b>Markdown</b> — для ChatGPT / Claude / Obsidian (группировка по дням)\n` +
      `📋 <b>JSON</b> — структурированный массив для RAG и баз данных\n` +
      `📊 <b>CSV</b> — для Google Таблиц / Excel и анализа просмотров\n` +
      `🚀 <b>TOON</b> — ультра-сжатый формат, экономящий до 80% токенов ИИ\n\n` +
      `Бот выгружает до 1000 последних постов из публичных каналов. Полностью бесплатно и без регистрации.`,
    invalidChannel: `❌ Не могу распознать канал(ы).\n\nОтправьте ссылку вида <code>@durov</code> или список через запятую: <code>@durov, @telegram</code>`,
    chooseFormat: `📡 Канал(ы): <b>{{channel}}</b>\n\nВыберите формат экспорта:`,
    exporting: `⏳ Экспортирую <b>@{{channel}}</b> в <b>{{format}}</b>...\n\nЭто может занять до 30 секунд.`,
    emptyOrUnavailable: `⚠️ Канал <b>@{{channel}}</b> пуст или недоступен.`,
    caption:
      `✅ <b>@{{channel}}</b>\n` +
      `📝 {{postsCount}} постов | 📦 {{size}} KB\n` +
      `💰 ~{{tokens}} токенов`,
    completed: `✅ Экспорт <b>@{{channel}}</b> → <b>{{format}}</b> завершён.`,
    error: `❌ Ошибка при экспорте <b>@{{channel}}</b>:\n<code>{{msg}}</code>`,
    btnMarkdown: "📄 Markdown",
    btnJson: "📋 JSON",
    btnCsv: "📊 CSV",
    btnToon: "🚀 TOON",
  },
  en: {
    start:
      `👋 <b>TG2AI</b> — export Telegram channels to AI-ready formats\n\n` +
      `Send me a channel link (or **multiple channels separated by commas**):\n` +
      `• <code>@durov, @telegram</code>\n` +
      `• <code>https://t.me/durov</code>\n\n` +
      `I will export them to <b>Markdown</b>, <b>JSON</b>, <b>CSV</b> or <b>TOON</b> — ` +
      `fully cleaned and optimized for ChatGPT, Claude, and RAG systems.`,
    help:
      `📖 <b>How to use:</b>\n\n` +
      `1. Send a channel link (or **multiple channels separated by commas**, up to 20)\n` +
      `2. Choose export format\n` +
      `3. Get your files (multiple channels will be automatically compiled into a single **ZIP archive**)\n\n` +
      `<b>Formats:</b>\n` +
      `📄 <b>Markdown</b> — for ChatGPT / Claude / Obsidian (grouped by date)\n` +
      `📋 <b>JSON</b> — structured array for RAG and databases\n` +
      `📊 <b>CSV</b> — for Google Sheets / Excel & growth analytics\n` +
      `🚀 <b>TOON</b> — hyper-compressed format saving up to 80% of LLM tokens\n\n` +
      `The bot exports up to 1000 recent posts from public channels. Completely free and stateless.`,
    invalidChannel: `❌ Cannot parse channel(s).\n\nSend a link like <code>@durov</code> or a list: <code>@durov, @telegram</code>`,
    chooseFormat: `📡 Channel(s): <b>{{channel}}</b>\n\nChoose export format:`,
    exporting: `⏳ Exporting <b>@{{channel}}</b> to <b>{{format}}</b>...\n\nThis may take up to 30 seconds.`,
    emptyOrUnavailable: `⚠️ Channel <b>@{{channel}}</b> is empty or unavailable.`,
    caption:
      `✅ <b>@{{channel}}</b>\n` +
      `📝 {{postsCount}} posts | 📦 {{size}} KB\n` +
      `💰 ~{{tokens}} tokens`,
    completed: `✅ Export of <b>@{{channel}}</b> → <b>{{format}}</b> completed.`,
    error: `❌ Error exporting <b>@{{channel}}</b>:\n<code>{{msg}}</code>`,
    btnMarkdown: "📄 Markdown",
    btnJson: "📋 JSON",
    btnCsv: "📊 CSV",
    btnToon: "🚀 TOON",
  },
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
// Message handler — user sends channel links
// ---------------------------------------------------------------------------

bot.on("message:text", async (ctx) => {
  const input = ctx.message.text;
  const lang = getLocale(ctx.from?.language_code);

  if (input.startsWith("/")) return;

  const channels = parseMultipleChannels(input, 20);
  if (channels.length === 0) {
    await ctx.reply(strings[lang].invalidChannel, { parse_mode: "HTML" });
    return;
  }

  const t = strings[lang];
  const keyboard = new InlineKeyboard()
    .text(t.btnMarkdown, `fmt:md:${lang}`)
    .text(t.btnJson, `fmt:json:${lang}`)
    .row()
    .text(t.btnCsv, `fmt:csv:${lang}`)
    .text(t.btnToon, `fmt:toon:${lang}`);

  const channelList = channels.map((c) => `@${c}`).join(", ");
  const label =
    channels.length > 1
      ? `${channels.length} channels (${channelList})`
      : `@${channels[0]}`;
  const msg = t.chooseFormat.replace("{{channel}}", label);

  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_markup: keyboard,
    reply_parameters: { message_id: ctx.message.message_id },
  });
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
  const format = parts[1] as FormatType;
  const lang = (parts[2] || "en") as "ru" | "en";

  const originalText = ctx.callbackQuery.message?.reply_to_message?.text;
  if (!originalText) {
    await ctx.answerCallbackQuery({ text: "Error: Original request lost." });
    return;
  }

  const channels = parseMultipleChannels(originalText, 20);
  if (channels.length === 0) {
    await ctx.answerCallbackQuery({ text: "No channels found." });
    return;
  }

  await ctx.answerCallbackQuery();
  const t = strings[lang];

  const statusMsg =
    channels.length > 1
      ? `⏳ Exporting ${channels.length} channels to ${format.toUpperCase()}...`
      : t.exporting
          .replace("{{channel}}", channels[0])
          .replace("{{format}}", format.toUpperCase());

  await ctx.editMessageText(statusMsg, { parse_mode: "HTML" });

  try {
    const allFiles = [];
    let totalPosts = 0;

    for (const channelName of channels) {
      const result = await scrapeChannel(channelName, 1000);
      if (result.posts.length > 0) {
        const files = formatExport(result, format);
        allFiles.push(...files);
        totalPosts += result.posts.length;
      }
    }

    if (allFiles.length === 0) {
      await ctx.editMessageText(
        "⚠️ All requested channels are empty or unavailable.",
        { parse_mode: "HTML" },
      );
      return;
    }

    const shouldZip = channels.length > 2 || allFiles.length > 10;

    if (shouldZip) {
      const zipBuffer = createArchive(allFiles);
      const zipFile = new InputFile(
        zipBuffer,
        `tg2ai_export_${new Date().toISOString().slice(0, 10)}.zip`,
      );

      await ctx.replyWithDocument(zipFile, {
        caption: `✅ <b>Export Complete</b>\n📚 Channels: ${channels.length}\n📝 Total posts: ${totalPosts}\n📦 Multi-channel Archive`,
        parse_mode: "HTML",
      });
    } else {
      for (const f of allFiles) {
        const buffer = Buffer.from(f.content, "utf-8");
        const file = new InputFile(buffer, f.filename);
        const tokens = Math.ceil(f.content.length / 4);

        await ctx.replyWithDocument(file, {
          caption: `✅ <b>@${f.filename.split("_")[0]}</b>\n📝 ${f.postsInChunk} posts | 💰 ~${tokens.toLocaleString()} tokens\n📅 ${f.dateRange}`,
          parse_mode: "HTML",
        });
      }
    }

    const completedLabel =
      channels.length > 1 ? `${channels.length} channels` : `@${channels[0]}`;
    await ctx.editMessageText(`✅ Export of ${completedLabel} completed.`, {
      parse_mode: "HTML",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    await ctx.editMessageText(`❌ Error during export:\n<code>${msg}</code>`, {
      parse_mode: "HTML",
    });
  }
});
