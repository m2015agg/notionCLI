import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { upsertSection, getMarkedSnippet, hasFullDocSection } from "../util/claude-md.js";
import { installSkill } from "../util/skill.js";
import { keyLoadedFromDotEnv } from "../util/env.js";
function prompt(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
export function installCommand() {
    return new Command("install")
        .description("Set up notion-cli globally (agent skill + CLAUDE.md pointer + shell profile)")
        .option("--skip-shell", "Skip shell profile modification")
        .option("--api-key <key>", "Notion API key (skips interactive prompt)")
        .option("--claude-md", "Inject the full command reference into CLAUDE.md instead of the skill + pointer (legacy)")
        .option("--postinstall", "Internal: non-interactive refresh run by npm postinstall — preserves an existing --claude-md full-doc choice")
        .action(async (opts) => {
        const home = homedir();
        const results = [];
        // 1. Agent skill + CLAUDE.md pointer (or legacy full doc with --claude-md)
        const claudeMd = join(home, ".claude", "CLAUDE.md");
        if (opts.claudeMd || (opts.postinstall && hasFullDocSection(claudeMd))) {
            // Explicit legacy choice, or postinstall refreshing a prior full-doc
            // choice in place — never silently downgrade it to the pointer.
            const claudeResult = upsertSection(claudeMd, getMarkedSnippet());
            results.push(`~/.claude/CLAUDE.md: ${claudeResult} (full doc)`);
            if (opts.postinstall) {
                results.push("  (kept legacy full-doc CLAUDE.md injection; run `notion-cli install` to migrate to the skill format)");
            }
        }
        else {
            const skillResult = installSkill(join(home, ".claude"));
            results.push(`~/.claude/skills/notion-cli/SKILL.md: ${skillResult}`);
            const claudeResult = upsertSection(claudeMd);
            results.push(`~/.claude/CLAUDE.md: ${claudeResult} (pointer)`);
        }
        // 2. Shell profile
        if (!opts.skipShell) {
            const shell = process.env.SHELL || "/bin/bash";
            const profileName = shell.includes("zsh") ? ".zshrc" : ".bashrc";
            const profilePath = join(home, profileName);
            // Get the API key. A value that loadDotEnv() pulled from ./.env is
            // project-local — never silently promote it to the global shell
            // profile; only a genuinely exported variable skips the prompt.
            let apiKey = opts.apiKey || "";
            if (!apiKey) {
                const existingKey = process.env.NOTION_API_KEY;
                const fromDotEnv = keyLoadedFromDotEnv();
                if (existingKey && existingKey !== "your-api-key-here" && !fromDotEnv) {
                    apiKey = existingKey;
                }
                else if (process.stdin.isTTY) {
                    process.stdout.write("\n");
                    process.stdout.write("  Get your API key at: https://www.notion.so/my-integrations\n");
                    process.stdout.write("  Create an integration → copy the Internal Integration Secret\n\n");
                    if (fromDotEnv && existingKey && existingKey !== "your-api-key-here") {
                        const answer = await prompt(`  Found NOTION_API_KEY in ./.env (${existingKey.slice(0, 8)}...). Press Enter to use it for your shell profile, or paste a different key: `);
                        apiKey = answer || existingKey;
                    }
                    else {
                        apiKey = await prompt("  Enter your NOTION_API_KEY: ");
                    }
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
                        const updated = content.replace(/export NOTION_API_KEY="[^"]*"/, exportLine);
                        writeFileSync(profilePath, updated);
                        results.push(`~/${profileName}: updated NOTION_API_KEY`);
                    }
                    else {
                        results.push(`~/${profileName}: NOTION_API_KEY already present`);
                    }
                }
                else {
                    appendFileSync(profilePath, `\n# notion-cli\n${exportLine}\n`);
                    results.push(`~/${profileName}: added NOTION_API_KEY`);
                }
            }
            else {
                writeFileSync(profilePath, `# notion-cli\n${exportLine}\n`);
                results.push(`~/${profileName}: created with NOTION_API_KEY`);
            }
        }
        process.stdout.write("\nnotion-cli install complete:\n");
        for (const r of results) {
            process.stdout.write(`  ${r}\n`);
        }
        // Validate API key works
        const finalKey = process.env.NOTION_API_KEY || opts.apiKey;
        if (finalKey && finalKey !== "your-api-key-here") {
            process.stdout.write("\nValidating API key...\n");
            try {
                const { execSync } = await import("node:child_process");
                const result = execSync("notion-cli users me --json", {
                    encoding: "utf-8",
                    timeout: 15000,
                    env: { ...process.env, NOTION_API_KEY: finalKey },
                });
                const parsed = JSON.parse(result);
                const name = parsed.name || parsed.bot?.owner?.workspace?.name || "unknown";
                process.stdout.write(`  Connected as: ${name}\n`);
            }
            catch {
                process.stdout.write("  Warning: API key validation failed. Check your key at notion.so/my-integrations\n");
            }
        }
        if (!opts.skipShell) {
            const shell = process.env.SHELL || "/bin/bash";
            const profileName = shell.includes("zsh") ? ".zshrc" : ".bashrc";
            process.stdout.write(`\nTo activate in your current shell, run:\n\n  source ~/${profileName}\n\n`);
        }
    });
}
//# sourceMappingURL=install.js.map