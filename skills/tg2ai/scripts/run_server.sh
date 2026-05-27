#!/bin/bash
# Check if bun is installed
if ! command -v bun &> /dev/null
then
    echo "Bun is not installed. Please install it from https://bun.sh"
    exit 1
fi

# Run the MCP server
exec bun run --filter @tg2ai/mcp start
