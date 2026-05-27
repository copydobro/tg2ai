import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelMeta {
  name: string;
  title: string;
  description: string;
  subscribers: string;
  photoUrl: string | null;
}

export interface TelegramPost {
  id: number;
  date: string; // ISO 8601
  text: string; // plain text
  textHtml: string; // original HTML
  views: string;
  mediaType: "photo" | "video" | "document" | "poll" | "none";
  mediaUrl: string | null;
  forwardFrom: string | null;
}

export interface ScrapeResult {
  channel: ChannelMeta;
  posts: TelegramPost[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function parseViews(raw: string | undefined): string {
  if (!raw) return "0";
  return raw.trim();
}

function detectMedia(
  $el: cheerio.Cheerio<any>,
): { type: TelegramPost["mediaType"]; url: string | null } {
  const photo = $el.find(".tgme_widget_message_photo_wrap");
  if (photo.length) {
    const style = photo.attr("style") || "";
    const match = style.match(/url\('([^']+)'\)/);
    return { type: "photo", url: match ? match[1] : null };
  }
  if ($el.find(".tgme_widget_message_video_wrap").length)
    return { type: "video", url: null };
  if ($el.find(".tgme_widget_message_document_wrap").length)
    return { type: "document", url: null };
  if ($el.find(".tgme_widget_message_poll").length)
    return { type: "poll", url: null };
  return { type: "none", url: null };
}

// ---------------------------------------------------------------------------
// Extract posts from a single HTML page
// ---------------------------------------------------------------------------

function extractPosts(html: string, channelName: string): TelegramPost[] {
  const $ = cheerio.load(html);
  const posts: TelegramPost[] = [];

  $(".tgme_widget_message_wrap").each((_i, wrap) => {
    const $msg = $(wrap).find(".tgme_widget_message");
    const dataPost = $msg.attr("data-post"); // "channel/12345"
    if (!dataPost) return;

    const postId = parseInt(dataPost.split("/")[1], 10);
    if (isNaN(postId)) return;

    const $text = $msg.find(".tgme_widget_message_text");
    const textHtml = $text.html() || "";
    const text = $text.text().trim();

    const dateEl = $msg.find(".tgme_widget_message_date time");
    const date = dateEl.attr("datetime") || "";

    const viewsRaw = $msg.find(".tgme_widget_message_views").text();
    const views = parseViews(viewsRaw);

    const media = detectMedia($msg);

    const fwdEl = $msg.find(".tgme_widget_message_forwarded_from_name");
    const forwardFrom = fwdEl.length ? fwdEl.text().trim() : null;

    posts.push({
      id: postId,
      date,
      text,
      textHtml,
      views,
      mediaType: media.type,
      mediaUrl: media.url,
      forwardFrom,
    });
  });

  return posts;
}

// ---------------------------------------------------------------------------
// Extract channel metadata
// ---------------------------------------------------------------------------

function extractMeta(
  html: string,
  channelName: string,
): ChannelMeta {
  const $ = cheerio.load(html);

  const title =
    $(".tgme_channel_info_header_title").text().trim() || channelName;
  const description =
    $(".tgme_channel_info_description").text().trim() || "";
  const subscribers =
    $(".tgme_channel_info_counter .counter_value").first().text().trim() || "?";
  const photoUrl =
    $(".tgme_channel_info_header_photo img").attr("src") || null;

  return {
    name: channelName,
    title,
    description,
    subscribers,
    photoUrl,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a channel username from various input formats.
 * Supports: @durov, durov, https://t.me/durov, https://t.me/s/durov
 */
export function parseChannelInput(input: string): string | null {
  const trimmed = input.trim();

  // https://t.me/s/channel or https://t.me/channel
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?t\.me\/(?:s\/)?([a-zA-Z_][a-zA-Z0-9_]{3,})/,
  );
  if (urlMatch) return urlMatch[1];

  // @channel
  const atMatch = trimmed.match(/^@([a-zA-Z_][a-zA-Z0-9_]{3,})$/);
  if (atMatch) return atMatch[1];

  // plain username
  const plainMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]{3,})$/);
  if (plainMatch) return plainMatch[1];

  return null;
}

/**
 * Scrape a public Telegram channel.
 * @param channelName — username without @
 * @param maxPosts — stop after collecting this many posts (default 200)
 */
export async function scrapeChannel(
  channelName: string,
  maxPosts = 200,
): Promise<ScrapeResult> {
  const baseUrl = `https://t.me/s/${channelName}`;

  // First page — also grab meta
  const firstResp = await fetch(baseUrl, {
    headers: { "User-Agent": UA },
  });
  if (!firstResp.ok) {
    throw new Error(
      `Channel not found or unavailable (HTTP ${firstResp.status})`,
    );
  }

  const firstHtml = await firstResp.text();
  const channel = extractMeta(firstHtml, channelName);
  const allPosts: TelegramPost[] = extractPosts(firstHtml, channelName);

  // Paginate backwards
  const maxPages = Math.ceil(maxPosts / 20) + 1;
  for (let page = 1; page < maxPages; page++) {
    if (allPosts.length >= maxPosts) break;

    const oldestId = Math.min(...allPosts.map((p) => p.id));
    if (!oldestId || oldestId <= 1) break;

    const pageUrl = `${baseUrl}?before=${oldestId}`;
    const resp = await fetch(pageUrl, {
      headers: { "User-Agent": UA },
    });
    if (!resp.ok) break;

    const html = await resp.text();
    const pagePosts = extractPosts(html, channelName);
    if (pagePosts.length === 0) break;

    allPosts.push(...pagePosts);
  }

  // Deduplicate by id, sort oldest→newest
  const seen = new Set<number>();
  const unique = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  unique.sort((a, b) => a.id - b.id);

  return {
    channel,
    posts: unique.slice(0, maxPosts),
  };
}
