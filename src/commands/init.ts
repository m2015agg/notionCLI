import { Command } from "commander";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { upsertSection } from "../util/claude-md.js";

export function initCommand(): Command {
  return new Command("init")
    .description("Initialize notion-cli in the current project (CLAUDE.md + .env + .gitignore)")
    .action(() => {
      const cwd = process.cwd();
      const results: string[] = [];

      // 1. Upsert into project CLAUDE.md
      const claudeMd = join(cwd, "CLAUDE.md");
      const claudeResult = upsertSection(claudeMd);
      results.push(`CLAUDE.md: ${claudeResult}`);

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

      process.stdout.write("notion-cli init complete:\n");
      for (const r of results) {
        process.stdout.write(`  ${r}\n`);
      }
    });
}
