import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
export function doctorCommand() {
    return new Command("doctor")
        .description("Check notion-cli setup and diagnose issues")
        .action(async () => {
        const checks = [];
        // 1. NOTION_API_KEY env var
        const apiKey = process.env.NOTION_API_KEY;
        if (!apiKey) {
            checks.push({ name: "NOTION_API_KEY env var", pass: false, detail: "Not set. Run: notion-cli install" });
        }
        else if (apiKey === "your-api-key-here") {
            checks.push({ name: "NOTION_API_KEY env var", pass: false, detail: "Still set to placeholder. Update your shell profile." });
        }
        else {
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
            }
            catch {
                checks.push({ name: "API key works", pass: false, detail: "API call failed. Check your key at notion.so/my-integrations" });
            }
        }
        else {
            checks.push({ name: "API key works", pass: false, detail: "Skipped (no valid key)" });
        }
        // 3. CLAUDE.md has skill doc (check cwd)
        const cwd = process.cwd();
        const claudeMdPaths = [
            join(cwd, "CLAUDE.md"),
            join(cwd, ".claude", "CLAUDE.md"),
        ];
        const hasSkillDoc = claudeMdPaths.some((p) => {
            if (!existsSync(p))
                return false;
            return readFileSync(p, "utf-8").includes("<!-- notion-cli:start -->");
        });
        if (hasSkillDoc) {
            checks.push({ name: "CLAUDE.md has skill doc", pass: true, detail: "Found notion-cli markers" });
        }
        else {
            checks.push({ name: "CLAUDE.md has skill doc", pass: false, detail: "Run: notion-cli init" });
        }
        // 4. .env has NOTION_API_KEY
        const envPath = join(cwd, ".env");
        if (existsSync(envPath)) {
            const envContent = readFileSync(envPath, "utf-8");
            if (envContent.includes("NOTION_API_KEY")) {
                checks.push({ name: ".env has NOTION_API_KEY", pass: true, detail: "Present" });
            }
            else {
                checks.push({ name: ".env has NOTION_API_KEY", pass: false, detail: "Missing from .env. Run: notion-cli init" });
            }
        }
        else {
            checks.push({ name: ".env has NOTION_API_KEY", pass: false, detail: "No .env file. Run: notion-cli init" });
        }
        // 5. Permissions approved
        const settingsPaths = [
            join(cwd, ".claude", "settings.json"),
            join(homedir(), ".claude", "settings.json"),
        ];
        let permissionsApproved = false;
        for (const sp of settingsPaths) {
            if (!existsSync(sp))
                continue;
            try {
                const content = readFileSync(sp, "utf-8");
                if (content.includes("notion-cli")) {
                    permissionsApproved = true;
                    break;
                }
            }
            catch {
                // ignore
            }
        }
        if (permissionsApproved) {
            checks.push({ name: "Permissions approved", pass: true, detail: "Found notion-cli in settings.json" });
        }
        else {
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
        }
        else {
            const failCount = checks.filter((c) => !c.pass).length;
            process.stdout.write(`  ${failCount} issue(s) found. See details above.\n\n`);
        }
        process.exit(allPass ? 0 : 1);
    });
}
//# sourceMappingURL=doctor.js.map