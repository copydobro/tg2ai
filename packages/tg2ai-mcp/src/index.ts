#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  formatExport,
  parseMultipleChannels,
  scrapeChannel,
} from "@tg2ai/core";

const server = new Server(
  {
    name: "tg2ai",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fetch_telegram_channel",
        description:
          "Scrapes one or more public Telegram channels and returns the content as Markdown. Supports up to 20 channels.",
        inputSchema: {
          type: "object",
          properties: {
            channel: {
              type: "string",
              description:
                "Channel username(s) or link(s). Can be multiple separated by spaces or commas.",
            },
            limit: {
              type: "number",
              description: "Max posts to fetch per channel (default: 1000).",
              default: 1000,
            },
            format: {
              type: "string",
              enum: ["md", "json", "csv", "toon"],
              description: "Output format (default: md).",
              default: "md",
            },
          },
          required: ["channel"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "fetch_telegram_channel") {
    const { channel, limit = 1000, format = "md" } = request.params.arguments as {
      channel: string;
      limit?: number;
      format?: "md" | "json" | "csv" | "toon";
    };

    const channels = parseMultipleChannels(channel, 20);
    if (channels.length === 0) {
      return {
        content: [{ type: "text", text: "No valid channels found." }],
        isError: true,
      };
    }

    try {
      const allFiles = [];
      for (const channelName of channels) {
        const result = await scrapeChannel(channelName, limit);
        if (result.posts.length > 0) {
          const files = formatExport(result, format);
          allFiles.push(...files);
        }
      }

      if (allFiles.length === 0) {
        return {
          content: [
            { type: "text", text: "All requested channels are empty." },
          ],
        };
      }

      return {
        content: allFiles.map((f) => ({
          type: "text" as const,
          text: `File: ${f.filename}\n\n${f.content}`,
        })),
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TG2AI MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
