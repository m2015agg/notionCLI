import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
function getCurrentVersion() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"));
    return pkg.version;
}
function getLatestVersion() {
    try {
        const result = execSync("npm view @m2015agg/notion-cli version", {
            encoding: "utf-8",
            timeout: 15000,
        });
        return result.trim();
    }
    catch {
        return null;
    }
}
export function updateCommand() {
    return new Command("update")
        .description("Update notion-cli to the latest version")
        .option("--check", "Check for updates without installing")
        .action((opts) => {
        const current = getCurrentVersion();
        process.stdout.write(`Current version: ${current}\n`);
        const latest = getLatestVersion();
        if (!latest) {
            process.stderr.write("Failed to check npm registry. Are you online?\n");
            process.exit(1);
        }
        process.stdout.write(`Latest version:  ${latest}\n`);
        // Simple semver comparison: split on dots, compare numerically
        const cParts = current.split(".").map(Number);
        const lParts = latest.split(".").map(Number);
        const isUpToDate = cParts[0] > lParts[0] ||
            (cParts[0] === lParts[0] && cParts[1] > lParts[1]) ||
            (cParts[0] === lParts[0] && cParts[1] === lParts[1] && cParts[2] >= lParts[2]);
        if (isUpToDate) {
            process.stdout.write("Already up to date!\n");
            return;
        }
        if (opts.check) {
            process.stdout.write(`\nUpdate available: ${current} → ${latest}\n`);
            process.stdout.write("Run: notion-cli update\n");
            return;
        }
        process.stdout.write(`\nUpdating ${current} → ${latest}...\n`);
        try {
            execSync("npm install -g @m2015agg/notion-cli@latest", {
                encoding: "utf-8",
                stdio: "inherit",
                timeout: 60000,
            });
            process.stdout.write("\nUpdate complete!\n");
            process.stdout.write("\n  Run `notion-cli init` in your project directories to update:\n");
            process.stdout.write("    - CLAUDE.md skill doc\n");
            process.stdout.write("    - /notion walkthrough skill\n");
            process.stdout.write("    - Claude Code permissions\n\n");
        }
        catch {
            process.stderr.write("Update failed. Try manually: npm install -g @m2015agg/notion-cli@latest\n");
            process.exit(1);
        }
    });
}
//# sourceMappingURL=update.js.map