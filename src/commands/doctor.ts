import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { hasSkill } from "../util/skill.js";
import { hasFullDocSection, hasMarkerSection } from "../util/claude-md.js";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export function doctorCommand(): Command {
  return new Command("doctor")
    .description("Check notion-cli setup and diagnose issues")
    .action(async () => {
      const checks: Check[] = [];

      // 1. NOTION_API_KEY env var
      const apiKey = process.env.NOTION_API_KEY;
      if (!apiKey) {
        checks.push({ name: "NOTION_API_KEY env var", pass: false, detail: "Not set. Run: notion-cli install" });
      } else if (apiKey === "your-api-key-here") {
        checks.push({ name: "NOTION_API_KEY env var", pass: false, detail: "Still set to placeholder. Update your shell profile." });
      } else {
        checks.push({ name: "NOTION_API_KEY env var", pass: true, detail: `Set (${apiKey.slice(0, 8)}...)` });
      }

      // 2. API key works
      if (apiKey && apiKey !== "your-api-key-here") {
        try {
          const result = execSync("notion-cli users me --json", {
            encoding: "utf-8",
            timeout: 15000,
            env: { ...process.env, NOTION_API_KEY: apiKey },
          });
          const parsed = JSON.parse(result);
          const name = parsed.name || parsed.bot?.owner?.workspace?.name || "unknown";
          checks.push({ name: "API key works", pass: true, detail: `Connected as: ${name}` });
        } catch {
          checks.push({ name: "API key works", pass: false, detail: "API call failed. Check your key at notion.so/my-integrations" });
        }
      } else {
        checks.push({ name: "API key works", pass: false, detail: "Skipped (no valid key)" });
      }

      // 3. Agent skill installed (global ~/.claude or project .claude)
      const cwd = process.cwd();
      const skillLocations: string[] = [];
      if (hasSkill(join(homedir(), ".claude"))) {
        skillLocations.push("~/.claude/skills/notion-cli/ (global)");
      }
      if (hasSkill(join(cwd, ".claude"))) {
        skillLocations.push(".claude/skills/notion-cli/ (project)");
      }

      // Legacy full-doc injections (markers containing the full command
      // reference, not the v0.6 pointer). Scanned regardless of skill
      // presence — the skill auto-installs on upgrade, but stale full-doc
      // blocks in CLAUDE.md files still waste context until migrated.
      // `install` only touches ~/.claude/CLAUDE.md; project files need `init`.
      const legacyPaths = [
        { path: join(cwd, "CLAUDE.md"), label: "CLAUDE.md", migrate: "notion-cli init" },
        { path: join(cwd, ".claude", "CLAUDE.md"), label: ".claude/CLAUDE.md", migrate: "notion-cli init" },
        { path: join(homedir(), ".claude", "CLAUDE.md"), label: "~/.claude/CLAUDE.md", migrate: "notion-cli install" },
      ];
      const legacyHits = legacyPaths.filter((p) => hasFullDocSection(p.path));
      const legacyHint = legacyHits
        .map((h) => `${h.label} (migrate with: ${h.migrate})`)
        .join(", ");

      if (skillLocations.length > 0) {
        const detail =
          legacyHits.length > 0
            ? `Found: ${skillLocations.join(", ")} — legacy full-doc injection still in ${legacyHint}`
            : `Found: ${skillLocations.join(", ")}`;
        checks.push({ name: "Agent skill installed", pass: true, detail });
      } else if (legacyHits.length > 0) {
        checks.push({
          name: "Agent skill installed",
          pass: true,
          detail: `Legacy full-doc CLAUDE.md injection in ${legacyHint} to switch to the skill format`,
        });
      } else if (legacyPaths.some((p) => hasMarkerSection(p.path))) {
        // A pointer exists but the skill it references does not.
        checks.push({
          name: "Agent skill installed",
          pass: false,
          detail: "CLAUDE.md pointer found but no skill installed. Run: notion-cli install (global) or notion-cli init (project)",
        });
      } else {
        checks.push({
          name: "Agent skill installed",
          pass: false,
          detail: "Run: notion-cli install (global) or notion-cli init (project)",
        });
      }

      // 4. .env has NOTION_API_KEY
      const envPath = join(cwd, ".env");
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, "utf-8");
        if (envContent.includes("NOTION_API_KEY")) {
          checks.push({ name: ".env has NOTION_API_KEY", pass: true, detail: "Present" });
        } else {
          checks.push({ name: ".env has NOTION_API_KEY", pass: false, detail: "Missing from .env. Run: notion-cli init" });
        }
      } else {
        checks.push({ name: ".env has NOTION_API_KEY", pass: false, detail: "No .env file. Run: notion-cli init" });
      }

      // 5. Permissions approved — inspect permissions.allow specifically.
      // A bare substring match over settings.json would also hit unrelated
      // notion-cli entries (e.g. the cron --hook SessionStart hook).
      const settingsPaths = [
        join(cwd, ".claude", "settings.json"),
        join(homedir(), ".claude", "settings.json"),
      ];
      let permissionsApproved = false;
      for (const sp of settingsPaths) {
        if (!existsSync(sp)) continue;
        try {
          const parsed: unknown = JSON.parse(readFileSync(sp, "utf-8"));
          const allow = (parsed as { permissions?: { allow?: unknown } })?.permissions?.allow;
          if (
            Array.isArray(allow) &&
            allow.some((entry) => typeof entry === "string" && entry.includes("notion-cli"))
          ) {
            permissionsApproved = true;
            break;
          }
        } catch {
          // ignore
        }
      }
      if (permissionsApproved) {
        checks.push({ name: "Permissions approved", pass: true, detail: "Found notion-cli entries in permissions.allow" });
      } else {
        checks.push({ name: "Permissions approved", pass: false, detail: "Run: notion-cli approve" });
      }

      // Output
      const allPass = checks.every((c) => c.pass);
      process.stdout.write("\nnotion-cli doctor\n");
      process.stdout.write("─".repeat(50) + "\n");
      for (const c of checks) {
        const icon = c.pass ? "✓" : "✗";
        process.stdout.write(`  ${icon} ${c.name}: ${c.detail}\n`);
      }
      process.stdout.write("─".repeat(50) + "\n");
      if (allPass) {
        process.stdout.write("  All checks passed!\n\n");
      } else {
        const failCount = checks.filter((c) => !c.pass).length;
        process.stdout.write(`  ${failCount} issue(s) found. See details above.\n\n`);
      }

      process.exit(allPass ? 0 : 1);
    });
}
