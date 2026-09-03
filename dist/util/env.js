import { readFileSync } from "node:fs";
import { join } from "node:path";
/**
 * Parse simple KEY=VALUE lines from .env content.
 * Skips blank lines and comments, allows an optional "export " prefix,
 * strips one pair of matching single or double quotes around the value,
 * and ignores malformed lines. No expansion, no dependencies.
 */
export function parseDotEnv(content) {
    const result = {};
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (line === "" || line.startsWith("#"))
            continue;
        const withoutExport = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
        const eq = withoutExport.indexOf("=");
        if (eq <= 0)
            continue;
        const key = withoutExport.slice(0, eq).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
            continue;
        let value = withoutExport.slice(eq + 1).trim();
        if (value.length >= 2 &&
            (value[0] === '"' || value[0] === "'") &&
            value[value.length - 1] === value[0]) {
            value = value.slice(1, -1);
        }
        result[key] = value;
    }
    return result;
}
let loadedFromDotEnv = false;
/**
 * True when the current process.env.NOTION_API_KEY value was populated by
 * loadDotEnv() from a project-local .env rather than genuinely exported.
 * Lets commands like `install` avoid persisting a project-scoped key globally.
 */
export function keyLoadedFromDotEnv() {
    return loadedFromDotEnv;
}
/**
 * Load NOTION_API_KEY from <dir>/.env if it is not already set.
 * Never overrides existing env vars and never sets any other key —
 * a focused CLI must not pollute the environment.
 */
export function loadDotEnv(dir = process.cwd()) {
    loadedFromDotEnv = false;
    if (process.env.NOTION_API_KEY)
        return;
    try {
        const content = readFileSync(join(dir, ".env"), "utf-8");
        const parsed = parseDotEnv(content);
        if (parsed.NOTION_API_KEY) {
            process.env.NOTION_API_KEY = parsed.NOTION_API_KEY;
            loadedFromDotEnv = true;
        }
    }
    catch {
        // No .env or unreadable — silently continue.
    }
}
//# sourceMappingURL=env.js.map