import type { ChannelMeta, TelegramPost, ScrapeResult } from "./scraper";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Threshold for splitting files (approximate tokens) */
export const MAX_TOKENS_PER_FILE = 50000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rough token estimate: ~1 token per 4 chars (GPT-family average) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Convert minimal HTML to Markdown (bold, italic, links, code) */
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre>(.*?)<\/pre>/gis, "```\n$1\n```")
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "") // strip remaining tags
    .trim();
}

function formatDate(iso: string): string {
  if (!iso) return "unknown";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return iso;
  }
}

function groupByDate(posts: TelegramPost[]): Map<string, TelegramPost[]> {
  const groups = new Map<string, TelegramPost[]>();
  for (const post of posts) {
    const day = formatDate(post.date);
    const arr = groups.get(day) || [];
    arr.push(post);
    groups.set(day, arr);
  }
  return groups;
}

/** Split posts into chunks based on token count */
export function chunkPostsByTokens(posts: TelegramPost[], maxTokens: number): TelegramPost[][] {
  const chunks: TelegramPost[][] = [];
  let currentChunk: TelegramPost[] = [];
  let currentTokens = 0;

  for (const post of posts) {
    const postTokens = estimateTokens(post.text);
    if (currentTokens + postTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(post);
    currentTokens += postTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Markdown formatter
// ---------------------------------------------------------------------------

export function toMarkdown(
  channel: ChannelMeta,
  posts: TelegramPost[],
  chunkInfo?: { index: number; total: number }
): string {
  const lines: string[] = [];
  const fullText = posts.map((p) => p.text).join(" ");
  const tokens = estimateTokens(fullText);

  // YAML frontmatter
  lines.push("---");
  lines.push(`channel: "@${channel.name}"`);
  lines.push(`title: "${channel.title}"`);
  if (chunkInfo) {
    lines.push(`chunk: ${chunkInfo.index + 1}/${chunkInfo.total}`);
  }
  lines.push(`subscribers: "${channel.subscribers}"`);
  lines.push(`exported_at: "${new Date().toISOString()}"`);
  lines.push(`posts_in_file: ${posts.length}`);
  lines.push(`estimated_tokens: ${tokens}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${channel.title}${chunkInfo ? ` (Part ${chunkInfo.index + 1})` : ""}`);
  lines.push("");
  if (channel.description && (!chunkInfo || chunkInfo.index === 0)) {
    lines.push(`> ${channel.description}`);
    lines.push("");
  }

  // Group posts by date
  const grouped = groupByDate(posts);

  for (const [date, dayPosts] of grouped) {
    lines.push(`## ${date}`);
    lines.push("");

    for (const post of dayPosts) {
      lines.push(`### Post #${post.id}`);
      lines.push("");

      const md = htmlToMarkdown(post.textHtml) || post.text;
      if (md) {
        lines.push(md);
        lines.push("");
      }

      if (post.forwardFrom) {
        lines.push(`↩️ Forwarded from: ${post.forwardFrom}`);
      }
      if (post.mediaType !== "none") {
        lines.push(`📎 Media: ${post.mediaType}`);
      }

      const meta: string[] = [];
      if (post.views && post.views !== "0") meta.push(`👁 ${post.views}`);
      meta.push(`🔗 [Original](https://t.me/${channel.name}/${post.id})`);
      lines.push(meta.join(" | "));

      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// JSON formatter
// ---------------------------------------------------------------------------

export function toJSON(
  channel: ChannelMeta,
  posts: TelegramPost[],
  chunkInfo?: { index: number; total: number }
): string {
  const fullText = posts.map((p) => p.text).join(" ");

  const output = {
    meta: {
      channel: `@${channel.name}`,
      title: channel.title,
      description: channel.description,
      subscribers: channel.subscribers,
      exported_at: new Date().toISOString(),
      chunk: chunkInfo ? `${chunkInfo.index + 1}/${chunkInfo.total}` : undefined,
      posts_in_file: posts.length,
      estimated_tokens: estimateTokens(fullText),
      schema_version: "1.0",
    },
    posts: posts.map((p) => ({
      id: p.id,
      date: p.date,
      text: p.text,
      text_markdown: htmlToMarkdown(p.textHtml),
      views: p.views,
      media_type: p.mediaType !== "none" ? p.mediaType : null,
      forward_from: p.forwardFrom,
      url: `https://t.me/${channel.name}/${p.id}`,
    })),
  };

  return JSON.stringify(output, null, 2);
}

// ---------------------------------------------------------------------------
// CSV formatter
// ---------------------------------------------------------------------------

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(
  channel: ChannelMeta,
  posts: TelegramPost[],
  chunkInfo?: { index: number; total: number }
): string {
  const headers = ["id", "date", "text", "views", "media_type", "forward_from", "url"];
  const lines: string[] = [headers.join(",")];

  for (const p of posts) {
    const row = [
      String(p.id),
      p.date,
      escapeCSV(p.text),
      p.views,
      p.mediaType !== "none" ? p.mediaType : "",
      p.forwardFrom || "",
      `https://t.me/${channel.name}/${p.id}`,
    ];
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Format dispatcher
// ---------------------------------------------------------------------------

export type FormatType = "md" | "json" | "csv";

export interface ExportFile {
  content: string;
  filename: string;
  mimeType: string;
}

export function formatExport(
  result: ScrapeResult,
  format: FormatType,
  maxTokens = MAX_TOKENS_PER_FILE
): ExportFile[] {
  const { channel, posts } = result;
  const ts = new Date().toISOString().slice(0, 10);
  const base = `${channel.name}_${ts}`;

  const postChunks = chunkPostsByTokens(posts, maxTokens);
  const files: ExportFile[] = [];

  postChunks.forEach((chunk, index) => {
    const chunkInfo = postChunks.length > 1 ? { index, total: postChunks.length } : undefined;
    const suffix = chunkInfo ? `_part${index + 1}` : "";
    
    let content = "";
    let filename = "";
    let mimeType = "";

    switch (format) {
      case "md":
        content = toMarkdown(channel, chunk, chunkInfo);
        filename = `${base}${suffix}.md`;
        mimeType = "text/markdown";
        break;
      case "json":
        content = toJSON(channel, chunk, chunkInfo);
        filename = `${base}${suffix}.json`;
        mimeType = "application/json";
        break;
      case "csv":
        content = toCSV(channel, chunk, chunkInfo);
        filename = `${base}${suffix}.csv`;
        mimeType = "text/csv";
        break;
    }

    files.push({ content, filename, mimeType });
  });

  return files;
}
