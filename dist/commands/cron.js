import { Command } from "commander";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
function write(msg) {
    process.stdout.write(msg);
}
const CRON_MARKER = "# notion-cli-snapshot";
const HOOK_COMMAND = "notion-cli snapshot --if-stale 24";
const HOOK_NEEDLE = "notion-cli snapshot";
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSnapshotHook(hook) {
    return (isPlainObject(hook) &&
        typeof hook.command === "string" &&
        hook.command.includes(HOOK_NEEDLE));
}
function entryHasSnapshotHook(entry) {
    return (isPlainObject(entry) &&
        Array.isArray(entry.hooks) &&
        entry.hooks.some(isSnapshotHook));
}
/** Read <cwd>/.claude/settings.json. Returns null (after printing a warning) on parse failure. */
function loadSettings(settingsPath) {
    if (!existsSync(settingsPath))
        return {};
    try {
        const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
        if (!isPlainObject(parsed)) {
            write(`\n  Warning: ${settingsPath} is not a JSON object — aborting without changes.\n\n`);
            return null;
        }
        return parsed;
    }
    catch (e) {
        write(`\n  Warning: could not parse ${settingsPath} (${e.message}) — aborting without changes.\n\n`);
        return null;
    }
}
function saveSettings(settingsPath, settings) {
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
/**
 * Remove the notion-cli SessionStart snapshot hook from a settings.json.
 * Quiet best-effort variant used by `uninstall` (and the --remove branch of
 * `cron --hook`): malformed files are left untouched and reported not_found.
 */
export function removeSnapshotHook(settingsPath) {
    if (!existsSync(settingsPath))
        return "not_found";
    let settings;
    try {
        const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
        if (!isPlainObject(parsed))
            return "not_found";
        settings = parsed;
    }
    catch {
        return "not_found";
    }
    const hooksVal = settings.hooks;
    if (!isPlainObject(hooksVal))
        return "not_found";
    const sessionStartVal = hooksVal.SessionStart;
    if (!Array.isArray(sessionStartVal))
        return "not_found";
    if (!sessionStartVal.some(entryHasSnapshotHook))
        return "not_found";
    const kept = sessionStartVal
        .map((entry) => {
        if (!entryHasSnapshotHook(entry))
            return entry;
        const e = entry;
        return { ...e, hooks: e.hooks.filter((h) => !isSnapshotHook(h)) };
    })
        .filter((entry) => !(isPlainObject(entry) && Array.isArray(entry.hooks) && entry.hooks.length === 0));
    if (kept.length > 0) {
        hooksVal.SessionStart = kept;
    }
    else {
        delete hooksVal.SessionStart;
    }
    if (Object.keys(hooksVal).length > 0) {
        settings.hooks = hooksVal;
    }
    else {
        delete settings.hooks;
    }
    saveSettings(settingsPath, settings);
    return "removed";
}
function handleHook(opts) {
    const settingsPath = join(process.cwd(), ".claude", "settings.json");
    const existed = existsSync(settingsPath);
    const settings = loadSettings(settingsPath);
    if (settings === null) {
        process.exitCode = 1;
        return;
    }
    const hooksVal = settings.hooks ?? {};
    if (!isPlainObject(hooksVal)) {
        write(`\n  Warning: "hooks" in ${settingsPath} is not an object — aborting without changes.\n\n`);
        process.exitCode = 1;
        return;
    }
    const sessionStartVal = hooksVal.SessionStart ?? [];
    if (!Array.isArray(sessionStartVal)) {
        write(`\n  Warning: "hooks.SessionStart" in ${settingsPath} is not an array — aborting without changes.\n\n`);
        process.exitCode = 1;
        return;
    }
    const configured = sessionStartVal.some(entryHasSnapshotHook);
    if (opts.status) {
        if (configured) {
            write(`\n  SessionStart hook is configured in ${settingsPath}\n\n`);
        }
        else {
            write(`\n  No notion-cli SessionStart hook in ${settingsPath}\n\n`);
        }
        return;
    }
    if (opts.remove) {
        if (!configured) {
            write(`\n  No notion-cli SessionStart hook to remove in ${settingsPath}\n\n`);
            return;
        }
        removeSnapshotHook(settingsPath);
        write(`\n  Removed notion-cli SessionStart hook from ${settingsPath}\n\n`);
        return;
    }
    if (configured) {
        write(`\n  SessionStart hook already configured in ${settingsPath}\n\n`);
        return;
    }
    sessionStartVal.push({ hooks: [{ type: "command", command: HOOK_COMMAND }] });
    hooksVal.SessionStart = sessionStartVal;
    settings.hooks = hooksVal;
    saveSettings(settingsPath, settings);
    write(`\n  ${existed ? "Updated" : "Created"} ${settingsPath}\n`);
    write(`    Added SessionStart hook: ${HOOK_COMMAND}\n\n`);
}
export function cronCommand() {
    return new Command("cron")
        .description("Keep the workspace snapshot fresh (nightly cron, or a Claude Code session hook via --hook)")
        .option("--time <HH:MM>", "Time to run (24h format)", "03:30")
        .option("--status", "Show current cron status")
        .option("--remove", "Remove cron entry")
        .option("--hook", "Use a Claude Code SessionStart hook in .claude/settings.json instead of crontab")
        .action((opts) => {
        if (opts.hook) {
            handleHook(opts);
            return;
        }
        if (opts.status) {
            try {
                const crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
                const entries = crontab.split("\n").filter((l) => l.includes(CRON_MARKER));
                if (entries.length === 0) {
                    write("\n  No notion-cli cron jobs found.\n\n");
                }
                else {
                    write("\n  Active notion-cli cron jobs:\n");
                    for (const e of entries) {
                        write(`    ${e}\n`);
                    }
                    write("\n");
                }
            }
            catch {
                write("\n  No crontab configured.\n\n");
            }
            return;
        }
        if (opts.remove) {
            try {
                const crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
                const filtered = crontab
                    .split("\n")
                    .filter((l) => !l.includes(CRON_MARKER))
                    .join("\n");
                execSync(`echo '${filtered}' | crontab -`, { encoding: "utf-8" });
                write("\n  Removed notion-cli cron entries.\n\n");
            }
            catch {
                write("\n  No crontab to clean.\n\n");
            }
            return;
        }
        const [hours, minutes] = opts.time.split(":");
        const cwd = process.cwd();
        const notionCli = resolve(process.argv[1]);
        const cronLine = `${minutes} ${hours} * * * cd ${cwd} && ${notionCli} snapshot >> /tmp/notion-cli-cron.log 2>&1 ${CRON_MARKER}:${cwd}`;
        try {
            let crontab = "";
            try {
                crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
            }
            catch { /* empty crontab */ }
            // Remove existing entry for this project
            const lines = crontab.split("\n").filter((l) => !l.includes(`${CRON_MARKER}:${cwd}`));
            lines.push(cronLine);
            execSync(`echo '${lines.join("\n")}' | crontab -`, { encoding: "utf-8" });
            write(`\n  Cron job configured:\n`);
            write(`    Schedule: ${minutes} ${hours} * * * (${opts.time} daily)\n`);
            write(`    Project: ${cwd}\n`);
            write(`    Log: /tmp/notion-cli-cron.log\n\n`);
        }
        catch (e) {
            write(`\n  Failed to set cron: ${e.message}\n\n`);
        }
    });
}
//# sourceMappingURL=cron.js.map