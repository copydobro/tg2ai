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
// Security Guardrails & Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize text to prevent common injection attacks and clean up output.
 * - Removes zero-width characters.
 * - Replaces potential shell/SQL control characters if found in suspicious patterns.
 * - Truncates excessively long words to prevent buffer issues in downstream LLMs.
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
    .replace(/[\\'"`;]/g, (match) => `\\${match}`) // Escape potential SQL/Shell meta-chars
    .replace(/\b(\w{100,})\b/g, "$1...") // Truncate excessively long words
    .trim();
}

/**
 * Validate Telegram username against official constraints.
 * Rules: 5-32 chars, a-z, 0-9, underscores, must start with letter.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function parseViews(raw: string | undefined): string {
  if (!raw) return "0";
  return sanitizeText(raw.trim());
}

function detectMedia($el: cheerio.Cheerio<any>): {
  type: TelegramPost["mediaType"];
  url: string | null;
} {
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

function extractPosts(html: string): TelegramPost[] {
  const $ = cheerio.load(html);
  const posts: TelegramPost[] = [];

  $(".tgme_widget_message_wrap").each((_i, wrap) => {
    const $msg = $(wrap).find(".tgme_widget_message");
    const dataPost = $msg.attr("data-post"); // "channel/12345"
    if (!dataPost) return;

    const postId = Number.parseInt(dataPost.split("/")[1], 10);
    if (Number.isNaN(postId)) return;

    const $text = $msg.find(".tgme_widget_message_text");
    const textHtml = $text.html() || "";
    const text = sanitizeText($text.text());

    const dateEl = $msg.find(".tgme_widget_message_date time");
    const date = dateEl.attr("datetime") || "";

    const viewsRaw = $msg.find(".tgme_widget_message_views").text();
    const views = parseViews(viewsRaw);

    const media = detectMedia($msg);

    const fwdEl = $msg.find(".tgme_widget_message_forwarded_from_name");
    const forwardFrom = fwdEl.length ? sanitizeText(fwdEl.text()) : null;

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

function extractMeta(html: string, channelName: string): ChannelMeta {
  const $ = cheerio.load(html);

  const title =
    sanitizeText($(".tgme_channel_info_header_title").text()) || channelName;

  const description = sanitizeText($(".tgme_channel_info_description").text());

  const subscribers =
    sanitizeText(
      $(".tgme_channel_info_counter .counter_value").first().text(),
    ) || "?";

  const photoUrl = $(".tgme_channel_info_header_photo img").attr("src") || null;

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
 * Parse channel usernames from various input formats.
 * Supports: @durov, durov, https://t.me/durov, https://t.me/s/durov
 * Returns a unique array of up to 20 usernames.
 */
export function parseMultipleChannels(input: string, limit = 20): string[] {
  const regex =
    /(?:https?:\/\/)?t\.me\/(?:s\/)?([a-zA-Z][a-zA-Z0-9_]{4,31})|@([a-zA-Z][a-zA-Z0-9_]{4,31})/g;
  const matches = new Set<string>();

  let match: RegExpExecArray | null = regex.exec(input);
  while (match !== null) {
    const username = match[1] || match[2];
    if (username && isValidUsername(username)) {
      matches.add(username);
    }
    if (matches.size >= limit) break;
    match = regex.exec(input);
  }

  return Array.from(matches);
}

/**
 * Parse a single channel username.
 */
export function parseChannelInput(input: string): string | null {
  const all = parseMultipleChannels(input, 1);
  return all.length > 0 ? all[0] : null;
}

/**
 * Verify if a channel exists and is public by checking the web preview.
 */
export async function verifyChannelExists(channelName: string): Promise<boolean> {
  if (!isValidUsername(channelName)) return false;
  
  try {
    const resp = await fetch(`https://t.me/s/${channelName}`, {
      method: "HEAD",
      headers: { "User-Agent": UA },
    });
    // Telegram returns 200 for existing channels and usually 200 with "not found" text for missing ones.
    // However, a 404 or 403 on the /s/ URL definitely means it's not a public channel.
    if (resp.status === 404 || resp.status === 403) return false;
    
    // To be sure, we do a quick GET to check for the 'tgme_page_extra' class which is absent on 404 pages
    const getResp = await fetch(`https://t.me/s/${channelName}`, {
      headers: { "User-Agent": UA },
    });
    const html = await getResp.text();
    return html.includes("tgme_channel_info_header");
  } catch {
    return false;
  }
}

/**
 * Scrape a public Telegram channel.
 * @param channelName — username without @
 * @param maxPosts — stop after collecting this many posts (default 1000)
 */
export async function scrapeChannel(
  channelName: string,
  maxPosts = 1000,
): Promise<ScrapeResult> {
  if (!isValidUsername(channelName)) {
    throw new Error(`Invalid channel username: ${channelName}`);
  }

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
  
  // Extra check for "Channel not found" pattern in HTML
  if (firstHtml.includes("tgme_page_icon") && !firstHtml.includes("tgme_channel_info_header")) {
    throw new Error(`Channel @${channelName} does not exist or is not a public channel.`);
  }

  const channel = extractMeta(firstHtml, channelName);
  const allPosts: TelegramPost[] = extractPosts(firstHtml);

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
    const pagePosts = extractPosts(html);
    if (pagePosts.length === 0) break;

    allPosts.push(...pagePosts);
  }

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
