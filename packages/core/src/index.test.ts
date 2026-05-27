import { expect, test, describe } from "bun:test";
import { parseChannelInput, toMarkdown, formatExport, chunkPostsByTokens, toTOON } from "./index";

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
    { id: 1, date: "2024-01-01T12:00:00Z", text: "hello\nworld", textHtml: "hello<br>world", views: "10", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }
  ];

  test("should generate markdown with frontmatter", () => {
    const md = toMarkdown(mockChannel, mockPosts);
    expect(md).toContain('channel: "@test"');
    expect(md).toContain("# Test Channel");
    expect(md).toContain("hello");
  });

  test("should generate TOON format", () => {
    const toon = toTOON(mockChannel, mockPosts);
    expect(toon).toContain("CHANNEL: @test");
    expect(toon).toContain("[1|2024-01-01|10v] hello world"); // line breaks replaced with spaces
  });

  test("should chunk posts by tokens", () => {
    const longPosts = [
      { id: 1, text: "a".repeat(100), textHtml: "", date: "2024-01-01T10:00:00Z", views: "", mediaType: "none" as const, mediaUrl: null, forwardFrom: null },
      { id: 2, text: "b".repeat(100), textHtml: "", date: "2024-01-01T11:00:00Z", views: "", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }
    ];
    // 1 token approx 4 chars. 100 chars approx 25 tokens.
    const chunks = chunkPostsByTokens(longPosts, 30); 
    expect(chunks.length).toBe(2);
  });

  test("formatExport should return correct metadata per chunk", () => {
    const longPosts = [
      { id: 1, text: "a".repeat(100), textHtml: "", date: "2024-01-01T10:00:00Z", views: "", mediaType: "none" as const, mediaUrl: null, forwardFrom: null },
      { id: 2, text: "b".repeat(100), textHtml: "", date: "2024-01-02T11:00:00Z", views: "", mediaType: "none" as const, mediaUrl: null, forwardFrom: null }
    ];
    const result = { channel: mockChannel, posts: longPosts };
    const files = formatExport(result, "md", 30); // small limit to force 2 chunks
    
    expect(files.length).toBe(2);
    expect(files[0].postsInChunk).toBe(1);
    expect(files[0].dateRange).toBe("2024-01-01 - 2024-01-01");
    expect(files[1].postsInChunk).toBe(1);
    expect(files[1].dateRange).toBe("2024-01-02 - 2024-01-02");
  });
});
