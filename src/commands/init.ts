import { Command } from "commander";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { upsertSection } from "../util/claude-md.js";
import { WALKTHROUGH_TEMPLATE } from "../templates/walkthrough.js";

export function initCommand(): Command {
  return new Command("init")
    .description("Initialize notion-cli in the current project (CLAUDE.md + .env + .gitignore + skill + permissions)")
    .action(() => {
      const cwd = process.cwd();
      const results: string[] = [];

      // 1. Upsert into project CLAUDE.md files
      const claudeMd = join(cwd, "CLAUDE.md");
      const claudeResult = upsertSection(claudeMd);
      results.push(`CLAUDE.md: ${claudeResult}`);

      // Also update .claude/CLAUDE.md if it exists
      const dotClaudeDir = join(cwd, ".claude");
      const dotClaudeMd = join(dotClaudeDir, "CLAUDE.md");
      if (existsSync(dotClaudeDir)) {
        const dotResult = upsertSection(dotClaudeMd);
        results.push(`.claude/CLAUDE.md: ${dotResult}`);
      }

      // 2. .env
      const envPath = join(cwd, ".env");
      if (!existsSync(envPath)) {
        writeFileSync(envPath, "NOTION_API_KEY=\n");
        results.push(".env: created with NOTION_API_KEY placeholder");
      } else {
        const envContent = readFileSync(envPath, "utf-8");
        if (envContent.includes("NOTION_API_KEY")) {
          results.push(".env: NOTION_API_KEY already present");
        } else {
          appendFileSync(envPath, "NOTION_API_KEY=\n");
          results.push(".env: appended NOTION_API_KEY placeholder");
        }
      }

      // 3. .gitignore
      const gitignorePath = join(cwd, ".gitignore");
      if (!existsSync(gitignorePath)) {
        writeFileSync(gitignorePath, ".env\n");
        results.push(".gitignore: created with .env");
      } else {
        const giContent = readFileSync(gitignorePath, "utf-8");
        if (giContent.includes(".env")) {
          results.push(".gitignore: .env already listed");
        } else {
          appendFileSync(gitignorePath, ".env\n");
          results.push(".gitignore: appended .env");
        }
      }

      // 4. /notion slash command
      const skillsDir = join(cwd, ".claude", "commands");
      const skillPath = join(skillsDir, "notion.md");
      if (!existsSync(skillsDir)) {
        mkdirSync(skillsDir, { recursive: true });
      }
      if (!existsSync(skillPath)) {
        writeFileSync(skillPath, WALKTHROUGH_TEMPLATE);
        results.push(".claude/commands/notion.md: created");
      } else {
        const existing = readFileSync(skillPath, "utf-8");
        if (existing !== WALKTHROUGH_TEMPLATE) {
          writeFileSync(skillPath, WALKTHROUGH_TEMPLATE);
          results.push(".claude/commands/notion.md: updated");
        } else {
          results.push(".claude/commands/notion.md: unchanged");
        }
      }

      // 5. Auto-approve read permissions
      try {
        execSync("notion-cli approve", { encoding: "utf-8", stdio: "pipe" });
        results.push("Permissions: read commands approved");
      } catch {
        results.push("Permissions: could not auto-approve (run: notion-cli approve)");
      }

      // 6. Snapshot workspace
      process.stdout.write("\n  Snapshotting workspace...\n");
      try {
        execSync("notion-cli snapshot", { encoding: "utf-8", stdio: "inherit" });
        results.push("Snapshot: workspace cached to .notion-cache/");
      } catch {
        results.push("Snapshot: failed (run: notion-cli snapshot)");
      }

      // 7. Add .notion-cache/ to .gitignore
      if (existsSync(gitignorePath)) {
        const giContent2 = readFileSync(gitignorePath, "utf-8");
        if (!giContent2.includes(".notion-cache")) {
          appendFileSync(gitignorePath, ".notion-cache/\n");
          results.push(".gitignore: appended .notion-cache/");
        }
      }

      // 8. Set up nightly cron
      try {
        execSync("notion-cli cron --time 03:30", { encoding: "utf-8", stdio: "pipe" });
        results.push("Cron: nightly snapshot at 03:30");
      } catch {
        results.push("Cron: could not set up (run: notion-cli cron)");
      }

      process.stdout.write("\nnotion-cli init complete:\n");
      for (const r of results) {
        process.stdout.write(`  ${r}\n`);
      }
      process.stdout.write("\n");
    });
}
