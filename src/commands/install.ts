import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { upsertSection } from "../util/claude-md.js";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function installCommand(): Command {
  return new Command("install")
    .description("Set up notion-cli globally (adds to ~/.claude/CLAUDE.md and shell profile)")
    .option("--skip-shell", "Skip shell profile modification")
    .option("--api-key <key>", "Notion API key (skips interactive prompt)")
    .action(async (opts: { skipShell?: boolean; apiKey?: string }) => {
      const home = homedir();
      const results: string[] = [];

      // 1. Upsert into global CLAUDE.md
      const claudeMd = join(home, ".claude", "CLAUDE.md");
      const claudeResult = upsertSection(claudeMd);
      results.push(`~/.claude/CLAUDE.md: ${claudeResult}`);

      // 2. Shell profile
      if (!opts.skipShell) {
        const shell = process.env.SHELL || "/bin/bash";
        const profileName = shell.includes("zsh") ? ".zshrc" : ".bashrc";
        const profilePath = join(home, profileName);

        // Get the API key
        let apiKey = opts.apiKey || "";
        if (!apiKey) {
          const existingKey = process.env.NOTION_API_KEY;
          if (existingKey && existingKey !== "your-api-key-here") {
            apiKey = existingKey;
          } else if (process.stdin.isTTY) {
            process.stdout.write("\n");
            process.stdout.write("  Get your API key at: https://www.notion.so/my-integrations\n");
            process.stdout.write("  Create an integration → copy the Internal Integration Secret\n\n");
            apiKey = await prompt("  Enter your NOTION_API_KEY: ");
          }
        }

        if (!apiKey) {
          apiKey = "your-api-key-here";
        }

        const exportLine = `export NOTION_API_KEY="${apiKey}"`;

        if (existsSync(profilePath)) {
          const content = readFileSync(profilePath, "utf-8");
          if (content.includes("NOTION_API_KEY")) {
            if (apiKey !== "your-api-key-here" && content.includes("your-api-key-here")) {
              // Replace placeholder with real key
              const updated = content.replace(
                /export NOTION_API_KEY="[^"]*"/,
                exportLine,
              );
              writeFileSync(profilePath, updated);
              results.push(`~/${profileName}: updated NOTION_API_KEY`);
            } else {
              results.push(`~/${profileName}: NOTION_API_KEY already present`);
            }
          } else {
            appendFileSync(profilePath, `\n# notion-cli\n${exportLine}\n`);
            results.push(`~/${profileName}: added NOTION_API_KEY`);
          }
        } else {
          writeFileSync(profilePath, `# notion-cli\n${exportLine}\n`);
          results.push(`~/${profileName}: created with NOTION_API_KEY`);
        }

      }

      process.stdout.write("\nnotion-cli install complete:\n");
      for (const r of results) {
        process.stdout.write(`  ${r}\n`);
      }

      if (!opts.skipShell) {
        const shell = process.env.SHELL || "/bin/bash";
        const profileName = shell.includes("zsh") ? ".zshrc" : ".bashrc";
        process.stdout.write(`\nTo activate in your current shell, run:\n\n  source ~/${profileName}\n\n`);
      }
    });
}
