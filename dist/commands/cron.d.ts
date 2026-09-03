import { Command } from "commander";
/**
 * Remove the notion-cli SessionStart snapshot hook from a settings.json.
 * Quiet best-effort variant used by `uninstall` (and the --remove branch of
 * `cron --hook`): malformed files are left untouched and reported not_found.
 */
export declare function removeSnapshotHook(settingsPath: string): "removed" | "not_found";
export declare function cronCommand(): Command;
