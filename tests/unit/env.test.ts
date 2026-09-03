import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDotEnv, loadDotEnv, keyLoadedFromDotEnv } from "../../src/util/env.js";

describe("parseDotEnv", () => {
  it("parses simple KEY=value pairs", () => {
    const parsed = parseDotEnv("NOTION_API_KEY=secret_abc123");
    expect(parsed.NOTION_API_KEY).toBe("secret_abc123");
  });

  it("parses export KEY=value", () => {
    const parsed = parseDotEnv("export NOTION_API_KEY=secret_abc123");
    expect(parsed.NOTION_API_KEY).toBe("secret_abc123");
  });

  it("strips double quotes from values", () => {
    const parsed = parseDotEnv('NOTION_API_KEY="secret with spaces"');
    expect(parsed.NOTION_API_KEY).toBe("secret with spaces");
  });

  it("strips single quotes from values", () => {
    const parsed = parseDotEnv("NOTION_API_KEY='secret with spaces'");
    expect(parsed.NOTION_API_KEY).toBe("secret with spaces");
  });

  it("ignores comments and blank lines", () => {
    const parsed = parseDotEnv("# a comment\n\nNOTION_API_KEY=abc\n\n# another comment\n");
    expect(parsed.NOTION_API_KEY).toBe("abc");
    expect(Object.keys(parsed)).toEqual(["NOTION_API_KEY"]);
  });

  it("ignores malformed lines", () => {
    const parsed = parseDotEnv("JUSTAWORD\n=nokey\nNOTION_API_KEY=abc\n");
    expect(parsed.NOTION_API_KEY).toBe("abc");
    expect(parsed).not.toHaveProperty("JUSTAWORD");
    expect(Object.keys(parsed)).toEqual(["NOTION_API_KEY"]);
  });

  it("parses multiple keys", () => {
    const parsed = parseDotEnv("NOTION_API_KEY=abc\nOTHER_SECRET=def\n");
    expect(parsed.NOTION_API_KEY).toBe("abc");
    expect(parsed.OTHER_SECRET).toBe("def");
  });
});

describe("loadDotEnv", () => {
  let dir: string;
  let savedKey: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "notion-cli-test-"));
    savedKey = process.env.NOTION_API_KEY;
    delete process.env.NOTION_API_KEY;
    delete process.env.OTHER_SECRET;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (savedKey === undefined) {
      delete process.env.NOTION_API_KEY;
    } else {
      process.env.NOTION_API_KEY = savedKey;
    }
    delete process.env.OTHER_SECRET;
  });

  it("sets NOTION_API_KEY from .env when previously unset", () => {
    writeFileSync(join(dir, ".env"), "NOTION_API_KEY=from_dotenv\n");
    loadDotEnv(dir);
    expect(process.env.NOTION_API_KEY).toBe("from_dotenv");
  });

  it("does not override an existing NOTION_API_KEY", () => {
    writeFileSync(join(dir, ".env"), "NOTION_API_KEY=from_dotenv\n");
    process.env.NOTION_API_KEY = "already_set";
    loadDotEnv(dir);
    expect(process.env.NOTION_API_KEY).toBe("already_set");
  });

  it("ignores other keys in the .env file", () => {
    writeFileSync(join(dir, ".env"), "NOTION_API_KEY=from_dotenv\nOTHER_SECRET=leaky\n");
    loadDotEnv(dir);
    expect(process.env.NOTION_API_KEY).toBe("from_dotenv");
    expect(process.env.OTHER_SECRET).toBeUndefined();
  });

  it("does nothing when the directory has no .env", () => {
    loadDotEnv(dir);
    expect(process.env.NOTION_API_KEY).toBeUndefined();
  });

  it("keyLoadedFromDotEnv is true only when the key came from .env", () => {
    writeFileSync(join(dir, ".env"), "NOTION_API_KEY=from_dotenv\n");
    loadDotEnv(dir);
    expect(keyLoadedFromDotEnv()).toBe(true);
  });

  it("keyLoadedFromDotEnv is false for a genuinely exported variable", () => {
    writeFileSync(join(dir, ".env"), "NOTION_API_KEY=from_dotenv\n");
    process.env.NOTION_API_KEY = "already_set";
    loadDotEnv(dir);
    expect(keyLoadedFromDotEnv()).toBe(false);
  });

  it("keyLoadedFromDotEnv is false when there is no .env", () => {
    loadDotEnv(dir);
    expect(keyLoadedFromDotEnv()).toBe(false);
  });
});
