#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { scrapeChannel, toMarkdown, parseChannelInput } from "@tg2ai/core";

const server = new Server(
  {
    name: "tg2ai",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fetch_telegram_channel",
        description: "Scrapes a public Telegram channel and returns it as Markdown.",
        inputSchema: {
          type: "object",
          properties: {
            channel: {
              type: "string",
              description: "Channel username (e.g., '@durov') or link.",
            },
            limit: {
              type: "number",
              description: "Max posts to fetch (default: 100).",
              default: 100,
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
    const { channel, limit = 100 } = request.params.arguments as {
      channel: string;
      limit?: number;
    };

    const channelName = parseChannelInput(channel);
    if (!channelName) {
      return {
        content: [{ type: "text", text: "Invalid channel input." }],
        isError: true,
      };
    }

    try {
      const result = await scrapeChannel(channelName, limit);
      const files = formatExport(result, "md"); // Default to md for MCP
      
      return {
        content: files.map(f => ({
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
