# TG2AI MCP Server for Agentic Workflows

This directory provides the scripts and configuration needed to run TG2AI as a Model Context Protocol (MCP) server.

## Scripts

- `run_server.sh`: Bash script to start the server using Bun.
- `run_server.ps1`: PowerShell script for Windows environments.

## MCP Configuration

To add this server to your agent (e.g., Claude Desktop, Gemini CLI), add the following to your MCP config file:

```json
{
  "mcpServers": {
    "tg2ai": {
      "command": "bun",
      "args": ["run", "--filter", "@tg2ai/mcp", "start"]
    }
  }
}
```
