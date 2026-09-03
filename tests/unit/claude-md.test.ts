import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  upsertSection,
  removeSection,
  getPointerSnippet,
  getMarkedSnippet,
  hasMarkerSection,
  hasFullDocSection,
} from "../../src/util/claude-md.js";

const MARKER_START = "<!-- notion-cli:start -->";
const MARKER_END = "<!-- notion-cli:end -->";

describe("claude-md snippets", () => {
  it("getPointerSnippet is a short pointer, not the full command reference", () => {
    const pointer = getPointerSnippet();
    expect(pointer).toContain("notion-cli");
    expect(pointer).not.toContain("### Pages");
  });

  it("getMarkedSnippet contains the full command reference between markers", () => {
    const marked = getMarkedSnippet();
    expect(marked).toContain(MARKER_START);
    expect(marked).toContain(MARKER_END);
    expect(marked).toContain("### Pages");
  });
});

describe("upsertSection / removeSection", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "notion-cli-test-"));
    filePath = join(dir, "CLAUDE.md");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a missing file with markers and the pointer text (not the full doc)", () => {
    expect(existsSync(filePath)).toBe(false);
    upsertSection(filePath);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain(MARKER_START);
    expect(content).toContain(MARKER_END);
    expect(content).toContain("notion-cli");
    expect(content).not.toContain("### Pages");
  });

  it("replaces an old full-doc marker section with the pointer, preserving surrounding content", () => {
    const before = "# My Project\n\nIntro text above the section.\n\n";
    const after = "\n## Unrelated section below\n\nKeep me too.\n";
    writeFileSync(filePath, before + getMarkedSnippet() + after);

    upsertSection(filePath);

    const content = readFileSync(filePath, "utf-8");
    // Unrelated content above and below survives
    expect(content).toContain("Intro text above the section.");
    expect(content).toContain("## Unrelated section below");
    expect(content).toContain("Keep me too.");
    // The old full doc is gone, replaced by the pointer
    expect(content).not.toContain("### Pages");
    expect(content).toContain(MARKER_START);
    expect(content).toContain(MARKER_END);
    // Only one marker pair remains
    expect(content.indexOf(MARKER_START)).toBe(content.lastIndexOf(MARKER_START));
    expect(content.indexOf(MARKER_END)).toBe(content.lastIndexOf(MARKER_END));
  });

  it("writes the full doc when passed getMarkedSnippet() explicitly", () => {
    upsertSection(filePath, getMarkedSnippet());
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain(MARKER_START);
    expect(content).toContain(MARKER_END);
    expect(content).toContain("### Pages");
  });

  it("removeSection strips the marker section but keeps other content", () => {
    const other = "# My Project\n\nKeep this line.\n\n";
    writeFileSync(filePath, other + getMarkedSnippet() + "\n");
    expect(removeSection(filePath)).toBe("removed");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("Keep this line.");
    expect(content).not.toContain(MARKER_START);
    expect(content).not.toContain(MARKER_END);
  });

  it("removeSection returns not_found when the file has no markers", () => {
    writeFileSync(filePath, "# My Project\n\nNo notion-cli section here.\n");
    expect(removeSection(filePath)).toBe("not_found");
    // File untouched
    expect(readFileSync(filePath, "utf-8")).toContain("No notion-cli section here.");
  });

  it("removeSection returns not_found when the file does not exist", () => {
    expect(removeSection(filePath)).toBe("not_found");
  });
});

describe("hasMarkerSection / hasFullDocSection", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "notion-cli-test-"));
    filePath = join(dir, "CLAUDE.md");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("both return false for a missing file", () => {
    expect(hasMarkerSection(filePath)).toBe(false);
    expect(hasFullDocSection(filePath)).toBe(false);
  });

  it("both return false when the file has no markers", () => {
    writeFileSync(filePath, "# My Project\n\nNo notion-cli section.\n");
    expect(hasMarkerSection(filePath)).toBe(false);
    expect(hasFullDocSection(filePath)).toBe(false);
  });

  it("pointer section: marker yes, full doc no", () => {
    writeFileSync(filePath, "# My Project\n\n" + getPointerSnippet() + "\n");
    expect(hasMarkerSection(filePath)).toBe(true);
    expect(hasFullDocSection(filePath)).toBe(false);
  });

  it("legacy full-doc section: both true", () => {
    writeFileSync(filePath, "# My Project\n\n" + getMarkedSnippet() + "\n");
    expect(hasMarkerSection(filePath)).toBe(true);
    expect(hasFullDocSection(filePath)).toBe(true);
  });

  it("a '### Pages' heading outside the markers does not count as a full doc", () => {
    writeFileSync(
      filePath,
      "### Pages\n\nUnrelated heading above.\n\n" + getPointerSnippet() + "\n",
    );
    expect(hasFullDocSection(filePath)).toBe(false);
  });
});
