import { expect, test, describe } from "bun:test";
import { parseChannelInput, toMarkdown } from "./index";

describe("Scraper Parser", () => {
  test("should parse channel username from link", () => {
    expect(parseChannelInput("https://t.me/durov")).toBe("durov");
    expect(parseChannelInput("@durov")).toBe("durov");
    expect(parseChannelInput("durov")).toBe("durov");
  });
});

describe("Formatters", () => {
  test("should generate markdown with frontmatter", () => {
    const mockResult = {
      channel: { name: "test", title: "Test Channel", description: "desc", subscribers: "100", photoUrl: null },
      posts: [{ id: 1, date: "2024-01-01T12:00:00Z", text: "hello", textHtml: "hello", views: "10", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }]
    };
    const md = toMarkdown(mockResult);
    expect(md).toContain('channel: "@test"');
    expect(md).toContain("# Test Channel");
    expect(md).toContain("hello");
  });
});
