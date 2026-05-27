#!/usr/bin/env bun
import { Command } from "commander";
import { scrapeChannel, formatExport, parseMultipleChannels, createArchive } from "@tg2ai/core";
import { writeFileSync } from "node:fs";

const program = new Command();

program
  .name("tg2ai")
  .description("Professional CLI for exporting Telegram channels to AI formats")
  .version("0.1.0");

program
  .command("fetch")
  .description("Fetch and export one or more Telegram channels")
  .argument("<channels>", "Comma or space separated channel list")
  .option("-f, --format <type>", "Output format: md, json, csv, toon", "md")
  .option("-l, --limit <number>", "Max posts per channel", "1000")
  .option("-o, --output <path>", "Output file name or path")
  .action(async (channelsInput, options) => {
    const channels = parseMultipleChannels(channelsInput, 20);
    if (channels.length === 0) {
      console.error("❌ No valid channels found.");
      process.exit(1);
    }

    console.error(`📡 Fetching ${channels.length} channel(s)...`);
    
    try {
      const allFiles = [];
      for (const channel of channels) {
        const result = await scrapeChannel(channel, parseInt(options.limit, 10));
        if (result.posts.length > 0) {
          const files = formatExport(result, options.format as any);
          allFiles.push(...files);
        }
      }

      if (allFiles.length === 0) {
        console.error("⚠️ All channels are empty.");
        return;
      }

      const shouldZip = allFiles.length > 1;
      
      if (shouldZip) {
        const archive = createArchive(allFiles);
        const outName = options.output || `tg2ai_export_${new Date().toISOString().slice(0, 10)}.zip`;
        writeFileSync(outName, archive);
        console.log(`✅ Exported ${allFiles.length} files to archive: ${outName}`);
      } else {
        const file = allFiles[0];
        const outName = options.output || file.filename;
        writeFileSync(outName, file.content);
        console.log(`✅ Exported ${channels[0]} to: ${outName}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

program.parse();
