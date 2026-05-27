import { expect, test, describe } from "bun:test";
import { parseChannelInput, toMarkdown, formatExport, chunkPostsByTokens } from "./index";

describe("Scraper Parser", () => {
  test("should parse channel username from link", () => {
    expect(parseChannelInput("https://t.me/durov")).toBe("durov");
    expect(parseChannelInput("@durov")).toBe("durov");
    expect(parseChannelInput("durov")).toBe("durov");
  });
});

describe("Formatters", () => {
  const mockChannel = { name: "test", title: "Test Channel", description: "desc", subscribers: "100", photoUrl: null };
  const mockPosts = [
    { id: 1, date: "2024-01-01T12:00:00Z", text: "hello", textHtml: "hello", views: "10", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }
  ];

  test("should generate markdown with frontmatter", () => {
    const md = toMarkdown(mockChannel, mockPosts);
    expect(md).toContain('channel: "@test"');
    expect(md).toContain("# Test Channel");
    expect(md).toContain("hello");
  });

  test("should chunk posts by tokens", () => {
    const longPosts = [
      { id: 1, text: "a".repeat(100), textHtml: "", date: "", views: "", mediaType: "none" as const, mediaUrl: null, forwardFrom: null },
      { id: 2, text: "b".repeat(100), textHtml: "", date: "", views: "", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }
    ];
    // 1 token approx 4 chars. 100 chars approx 25 tokens.
    const chunks = chunkPostsByTokens(longPosts, 30); 
    expect(chunks.length).toBe(2);
    expect(chunks[0][0].id).toBe(1);
    expect(chunks[1][0].id).toBe(2);
  });

  test("formatExport should return array of files", () => {
    const result = { channel: mockChannel, posts: mockPosts };
    const files = formatExport(result, "md");
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBe(1);
    expect(files[0].filename).toContain("test");
  });
});
