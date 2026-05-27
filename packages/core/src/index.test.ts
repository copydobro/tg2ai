import { expect, test, describe } from "bun:test";
import { parseMultipleChannels, toMarkdown, formatExport, chunkPostsByTokens, toTOON, createArchive } from "./index";

describe("Scraper Parser", () => {
  test("should parse multiple channels from text", () => {
    const input = "Check @durov and https://t.me/telegram also @nextjs_en";
    const channels = parseMultipleChannels(input);
    expect(channels).toEqual(["durov", "telegram", "nextjs_en"]);
  });

  test("should respect limit of channels", () => {
    const input = "@aaaaa @bbbbb @ccccc @ddddd";
    const channels = parseMultipleChannels(input, 2);
    expect(channels.length).toBe(2);
  });
});

describe("Formatters", () => {
  const mockChannel = { name: "testchannel", title: "Test Channel", description: "desc", subscribers: "100", photoUrl: null };
  const mockPosts = [
    { id: 1, date: "2024-01-01T12:00:00Z", text: "hello\nworld", textHtml: "hello<br>world", views: "10", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }
  ];

  test("should generate markdown with frontmatter", () => {
    const md = toMarkdown(mockChannel, mockPosts);
    expect(md).toContain('channel: "@testchannel"');
    expect(md).toContain("# Test Channel");
  });

  test("should generate TOON format", () => {
    const toon = toTOON(mockChannel, mockPosts);
    expect(toon).toContain("CHANNEL: @testchannel");
    expect(toon).toContain("[1|2024-01-01|10v] hello world");
  });

  test("should create ZIP archive", () => {
    const files = formatExport({ channel: mockChannel, posts: mockPosts }, "md");
    const zip = createArchive(files);
    expect(zip.length).toBeGreaterThan(0);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4B);
  });
});
