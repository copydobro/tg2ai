import { describe, expect, test } from "bun:test";
import {
  createArchive,
  formatExport,
  isValidUsername,
  parseMultipleChannels,
  sanitizeText,
  toMarkdown,
  toTOON,
} from "./index";

describe("Security Guardrails", () => {
  test("sanitizeText should escape shell and SQL meta-characters", () => {
    const malicious = "'; DROP TABLE users; --";
    const sanitized = sanitizeText(malicious);
    expect(sanitized).toBe("\\'; DROP TABLE users\\; \\-\\-");
  });

  test("sanitizeText should truncate excessively long words", () => {
    const longWord = "a".repeat(150);
    const sanitized = sanitizeText(longWord);
    expect(sanitized.length).toBeLessThan(150);
    expect(sanitized).toContain("...");
  });

  test("isValidUsername should validate telegram rules", () => {
    expect(isValidUsername("durov")).toBe(true);
    expect(isValidUsername("abc")).toBe(false); // too short
    expect(isValidUsername("12345")).toBe(false); // starts with digit
    expect(isValidUsername("valid_name_123")).toBe(true);
  });
});

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
  const mockChannel = {
    name: "testchannel",
    title: "Test Channel",
    description: "desc",
    subscribers: "100",
    photoUrl: null,
  };
  const mockPosts = [
    {
      id: 1,
      date: "2024-01-01T12:00:00Z",
      text: "hello\nworld",
      textHtml: "hello<br>world",
      views: "10",
      mediaType: "none" as const,
      mediaUrl: null,
      forwardFrom: null,
    },
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
    const files = formatExport(
      { channel: mockChannel, posts: mockPosts },
      "md",
    );
    const zip = createArchive(files);
    expect(zip.length).toBeGreaterThan(0);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
  });
});
