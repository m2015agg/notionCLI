import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeSnapshotHook } from "../../src/commands/cron.js";

const SNAPSHOT_HOOK = { type: "command", command: "notion-cli snapshot --if-stale 24" };
const OTHER_HOOK = { type: "command", command: "echo unrelated" };

describe("removeSnapshotHook", () => {
  let dir: string;
  let settingsPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "notion-cli-test-"));
    mkdirSync(join(dir, ".claude"), { recursive: true });
    settingsPath = join(dir, ".claude", "settings.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns not_found when the settings file does not exist", () => {
    expect(removeSnapshotHook(settingsPath)).toBe("not_found");
    expect(existsSync(settingsPath)).toBe(false);
  });

  it("returns not_found and leaves malformed JSON untouched", () => {
    writeFileSync(settingsPath, "{ not json");
    expect(removeSnapshotHook(settingsPath)).toBe("not_found");
    expect(readFileSync(settingsPath, "utf-8")).toBe("{ not json");
  });

  it("returns not_found when no snapshot hook is configured", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({ hooks: { SessionStart: [{ hooks: [OTHER_HOOK] }] } }),
    );
    expect(removeSnapshotHook(settingsPath)).toBe("not_found");
  });

  it("removes the snapshot hook and drops empty hooks structures", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: { allow: ["Bash(notion-cli search:*)"] },
        hooks: { SessionStart: [{ hooks: [SNAPSHOT_HOOK] }] },
      }),
    );
    expect(removeSnapshotHook(settingsPath)).toBe("removed");
    const after = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(after.hooks).toBeUndefined();
    // Unrelated settings survive
    expect(after.permissions.allow).toEqual(["Bash(notion-cli search:*)"]);
  });

  it("keeps other SessionStart hooks when removing the snapshot hook", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: { SessionStart: [{ hooks: [SNAPSHOT_HOOK, OTHER_HOOK] }] },
      }),
    );
    expect(removeSnapshotHook(settingsPath)).toBe("removed");
    const after = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(after.hooks.SessionStart).toEqual([{ hooks: [OTHER_HOOK] }]);
  });
});
