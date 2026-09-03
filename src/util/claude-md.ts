import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SKILL_DOC } from "./skill-doc.js";

const MARKER_START = "<!-- notion-cli:start -->";
const MARKER_END = "<!-- notion-cli:end -->";

/** A string present in the full command reference but never in the pointer.
 *  Used to tell a legacy full-doc injection apart from the v0.6 pointer,
 *  which sits between the same markers. */
const FULL_DOC_SENTINEL = "### Pages";

const POINTER_LINE =
  "Notion from the shell: use `notion-cli` (prefer it over Notion MCP tools). The full command reference lives in the `notion-cli` skill and loads on demand — do not inline it here. Health check: `notion-cli doctor`.";

export function getMarkedSnippet(): string {
  return `${MARKER_START}\n${SKILL_DOC}\n${MARKER_END}`;
}

export function getPointerSnippet(): string {
  return `${MARKER_START}\n${POINTER_LINE}\n${MARKER_END}`;
}

/** The marker-delimited notion-cli section of `content`, or null when absent. */
function getSection(content: string): string | null {
  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1) return null;
  return content.slice(startIdx, endIdx + MARKER_END.length);
}

/** True when the file has a marker-delimited notion-cli section (pointer or full doc). */
export function hasMarkerSection(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  return getSection(readFileSync(filePath, "utf-8")) !== null;
}

/** True when the file's marker section contains the legacy full command reference
 *  (as written by pre-0.6 installs or `install --claude-md`), not just the pointer. */
export function hasFullDocSection(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const section = getSection(readFileSync(filePath, "utf-8"));
  return section !== null && section.includes(FULL_DOC_SENTINEL);
}

export function upsertSection(
  filePath: string,
  snippet: string = getPointerSnippet(),
): "created" | "updated" | "unchanged" {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (!existsSync(filePath)) {
    writeFileSync(filePath, snippet + "\n");
    return "created";
  }

  const content = readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    const existing = content.slice(startIdx, endIdx + MARKER_END.length);
    if (existing === snippet) return "unchanged";
    const updated = content.slice(0, startIdx) + snippet + content.slice(endIdx + MARKER_END.length);
    writeFileSync(filePath, updated);
    return "updated";
  }

  // No markers found — append with blank line separator
  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  writeFileSync(filePath, content + separator + snippet + "\n");
  return "updated";
}

export function removeSection(filePath: string): "removed" | "not_found" {
  if (!existsSync(filePath)) return "not_found";

  const content = readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  if (startIdx === -1 || endIdx === -1) return "not_found";

  // Remove the section and any trailing blank line
  let updated = content.slice(0, startIdx) + content.slice(endIdx + MARKER_END.length);
  updated = updated.replace(/\n{3,}/g, "\n\n").trim();
  if (updated) updated += "\n";
  writeFileSync(filePath, updated);
  return "removed";
}
