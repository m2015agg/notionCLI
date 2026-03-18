import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const READ_COMMANDS = [
  "Bash(notion-cli pages get:*)",
  "Bash(notion-cli db get:*)",
  "Bash(notion-cli db query:*)",
  "Bash(notion-cli blocks get:*)",
  "Bash(notion-cli blocks children:*)",
  "Bash(notion-cli comments list:*)",
  "Bash(notion-cli comments get:*)",
  "Bash(notion-cli search:*)",
  "Bash(notion-cli files list:*)",
  "Bash(notion-cli files get:*)",
  "Bash(notion-cli users me:*)",
  "Bash(notion-cli users list:*)",
  "Bash(notion-cli workspace:*)",
  "Bash(notion-cli snapshot:*)",
  "Bash(notion-cli cron --status:*)",
];

interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

function loadSettings(path: string): ClaudeSettings {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(path: string, settings: ClaudeSettings): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + "\n");
}

export function approveCommand(): Command {
  return new Command("approve")
    .description("Pre-approve read-only notion-cli commands in Claude Code settings")
    .option("--global", "Write to ~/.claude/settings.json instead of .claude/settings.json")
    .option("--remove", "Remove notion-cli permissions instead of adding them")
    .action((opts: { global?: boolean; remove?: boolean }) => {
      const settingsPath = opts.global
        ? join(homedir(), ".claude", "settings.json")
        : join(process.cwd(), ".claude", "settings.json");

      const settings = loadSettings(settingsPath);

      if (!settings.permissions) {
        settings.permissions = {};
      }
      if (!Array.isArray(settings.permissions.allow)) {
        settings.permissions.allow = [];
      }

      const existing = new Set(settings.permissions.allow);
      const added: string[] = [];
      const removed: string[] = [];
      const alreadyPresent: string[] = [];

      if (opts.remove) {
        for (const cmd of READ_COMMANDS) {
          if (existing.has(cmd)) {
            existing.delete(cmd);
            removed.push(cmd);
          }
        }
        settings.permissions.allow = [...existing];
      } else {
        for (const cmd of READ_COMMANDS) {
          if (existing.has(cmd)) {
            alreadyPresent.push(cmd);
          } else {
            existing.add(cmd);
            added.push(cmd);
          }
        }
        settings.permissions.allow = [...existing];
      }

      saveSettings(settingsPath, settings);

      const relPath = opts.global ? "~/.claude/settings.json" : ".claude/settings.json";
      process.stdout.write(`\nnotion-cli approve (${relPath})\n`);
      process.stdout.write("─".repeat(50) + "\n");

      if (opts.remove) {
        if (removed.length > 0) {
          process.stdout.write(`  Removed ${removed.length} permission(s):\n`);
          for (const r of removed) process.stdout.write(`    - ${r}\n`);
        } else {
          process.stdout.write("  No notion-cli permissions found to remove.\n");
        }
      } else {
        if (added.length > 0) {
          process.stdout.write(`  Added ${added.length} permission(s):\n`);
          for (const a of added) process.stdout.write(`    + ${a}\n`);
        }
        if (alreadyPresent.length > 0) {
          process.stdout.write(`  Already approved: ${alreadyPresent.length}\n`);
        }
        if (added.length === 0 && alreadyPresent.length > 0) {
          process.stdout.write("  All read commands already approved.\n");
        }
      }
      process.stdout.write("\n");
    });
}
