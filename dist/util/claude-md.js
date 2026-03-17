import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SKILL_DOC } from "../commands/docs.js";
const MARKER_START = "<!-- notion-cli:start -->";
const MARKER_END = "<!-- notion-cli:end -->";
export function getMarkedSnippet() {
    return `${MARKER_START}\n${SKILL_DOC}\n${MARKER_END}`;
}
export function upsertSection(filePath) {
    const snippet = getMarkedSnippet();
    const dir = dirname(filePath);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    if (!existsSync(filePath)) {
        writeFileSync(filePath, snippet + "\n");
        return "created";
    }
    const content = readFileSync(filePath, "utf-8");
    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx !== -1 && endIdx !== -1) {
        const existing = content.slice(startIdx, endIdx + MARKER_END.length);
        if (existing === snippet)
            return "unchanged";
        const updated = content.slice(0, startIdx) + snippet + content.slice(endIdx + MARKER_END.length);
        writeFileSync(filePath, updated);
        return "updated";
    }
    // No markers found — append with blank line separator
    const separator = content.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(filePath, content + separator + snippet + "\n");
    return "updated";
}
export function removeSection(filePath) {
    if (!existsSync(filePath))
        return "not_found";
    const content = readFileSync(filePath, "utf-8");
    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx === -1 || endIdx === -1)
        return "not_found";
    // Remove the section and any trailing blank line
    let updated = content.slice(0, startIdx) + content.slice(endIdx + MARKER_END.length);
    updated = updated.replace(/\n{3,}/g, "\n\n").trim();
    if (updated)
        updated += "\n";
    writeFileSync(filePath, updated);
    return "removed";
}
//# sourceMappingURL=claude-md.js.map