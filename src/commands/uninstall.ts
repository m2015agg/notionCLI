import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { removeSection } from "../util/claude-md.js";

export function uninstallCommand(): Command {
  return new Command("uninstall")
    .description("Remove notion-cli entries from global ~/.claude/CLAUDE.md")
    .option("--remove-env", "Also remove NOTION_API_KEY from shell profile")
    .action((opts: { removeEnv?: boolean }) => {
      const home = homedir();
      const results: string[] = [];

      // 1. Remove from global CLAUDE.md
      const claudeMd = join(home, ".claude", "CLAUDE.md");
      const claudeResult = removeSection(claudeMd);
      results.push(`~/.claude/CLAUDE.md: ${claudeResult}`);

      // 2. Optionally remove from shell profile
      if (opts.removeEnv) {
        const shell = process.env.SHELL || "/bin/bash";
        const profileName = shell.includes("zsh") ? ".zshrc" : ".bashrc";
        const profilePath = join(home, profileName);

        if (existsSync(profilePath)) {
          const content = readFileSync(profilePath, "utf-8");
          const updated = content
            .replace(/\n?# notion-cli\nexport NOTION_API_KEY="[^"]*"\n?/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim() + "\n";
          writeFileSync(profilePath, updated);
          results.push(`~/${profileName}: removed NOTION_API_KEY`);
        } else {
          results.push(`~/${profileName}: not found`);
        }
      }

      process.stdout.write("notion-cli uninstall complete:\n");
      for (const r of results) {
        process.stdout.write(`  ${r}\n`);
      }
      process.stdout.write("\nTo remove the binary: npm uninstall -g notion-cli\n");
    });
}
