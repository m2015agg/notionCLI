import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { upsertSection } from "../util/claude-md.js";

export function installCommand(): Command {
  return new Command("install")
    .description("Set up notion-cli globally (adds to ~/.claude/CLAUDE.md and shell profile)")
    .option("--skip-shell", "Skip shell profile modification")
    .action((opts: { skipShell?: boolean }) => {
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

        if (existsSync(profilePath)) {
          const content = readFileSync(profilePath, "utf-8");
          if (content.includes("NOTION_API_KEY")) {
            results.push(`~/${profileName}: NOTION_API_KEY already present`);
          } else {
            appendFileSync(profilePath, '\n# notion-cli\nexport NOTION_API_KEY="your-api-key-here"\n');
            results.push(`~/${profileName}: added NOTION_API_KEY placeholder`);
          }
        } else {
          writeFileSync(profilePath, '# notion-cli\nexport NOTION_API_KEY="your-api-key-here"\n');
          results.push(`~/${profileName}: created with NOTION_API_KEY placeholder`);
        }
      }

      process.stdout.write("notion-cli install complete:\n");
      for (const r of results) {
        process.stdout.write(`  ${r}\n`);
      }
    });
}
