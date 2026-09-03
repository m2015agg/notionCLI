import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { removeSection } from "../util/claude-md.js";
import { removeSkill } from "../util/skill.js";
import { removeSnapshotHook } from "./cron.js";

export function uninstallCommand(): Command {
  return new Command("uninstall")
    .description("Remove the notion-cli agent skill and entries from global ~/.claude/CLAUDE.md")
    .option("--remove-env", "Also remove NOTION_API_KEY from shell profile")
    .action((opts: { removeEnv?: boolean }) => {
      const home = homedir();
      const results: string[] = [];

      // 1. Remove the agent skill
      const skillResult = removeSkill(join(home, ".claude"));
      results.push(`~/.claude/skills/notion-cli/: ${skillResult}`);

      // 2. Remove from global CLAUDE.md
      const claudeMd = join(home, ".claude", "CLAUDE.md");
      const claudeResult = removeSection(claudeMd);
      results.push(`~/.claude/CLAUDE.md: ${claudeResult}`);

      // 3. Remove the cron --hook SessionStart hook from this project's
      // settings, so session starts don't invoke a soon-to-be-missing binary.
      const hookResult = removeSnapshotHook(join(process.cwd(), ".claude", "settings.json"));
      if (hookResult === "removed") {
        results.push(".claude/settings.json: removed SessionStart snapshot hook");
      }

      // 4. Optionally remove from shell profile
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
      process.stdout.write("\nBefore removing the binary, clean up in each project that uses it:\n");
      process.stdout.write("  notion-cli cron --hook --remove   # SessionStart snapshot hook\n");
      process.stdout.write("  notion-cli cron --remove          # nightly crontab entry\n");
      process.stdout.write("\nTo remove the binary: npm uninstall -g @m2015agg/notion-cli\n");
    });
}
