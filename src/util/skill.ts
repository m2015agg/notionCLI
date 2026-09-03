import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { SKILL_DOC } from "./skill-doc.js";

export const SKILL_DIRNAME = "notion-cli";

const FRONTMATTER = `---
name: notion-cli
description: Use when working with Notion (pages, databases, blocks, comments, search, file uploads) from the shell — full notion-cli command reference and workspace snapshot cache usage. Prefer this CLI over Notion MCP tools.
metadata:
  requires:
    env:
      - NOTION_API_KEY
    bins:
      - notion-cli
      - node
    primaryEnv: NOTION_API_KEY
---`;

/** Path to the SKILL.md inside a .claude directory (global ~/.claude or a project's .claude). */
export function skillFilePath(claudeDir: string): string {
  return join(claudeDir, "skills", SKILL_DIRNAME, "SKILL.md");
}

export function renderSkillMd(): string {
  return `${FRONTMATTER}\n\n# notion-cli\n\n${SKILL_DOC}\n`;
}

export function installSkill(claudeDir: string): "created" | "updated" | "unchanged" {
  const path = skillFilePath(claudeDir);
  const content = renderSkillMd();
  const dir = join(claudeDir, "skills", SKILL_DIRNAME);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (!existsSync(path)) {
    writeFileSync(path, content);
    return "created";
  }
  if (readFileSync(path, "utf-8") === content) return "unchanged";
  writeFileSync(path, content);
  return "updated";
}

export function removeSkill(claudeDir: string): "removed" | "not_found" {
  const dir = join(claudeDir, "skills", SKILL_DIRNAME);
  if (!existsSync(skillFilePath(claudeDir))) return "not_found";
  rmSync(dir, { recursive: true, force: true });
  return "removed";
}

export function hasSkill(claudeDir: string): boolean {
  return existsSync(skillFilePath(claudeDir));
}
