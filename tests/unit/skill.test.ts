import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SKILL_DIRNAME,
  skillFilePath,
  renderSkillMd,
  installSkill,
  removeSkill,
  hasSkill,
} from "../../src/util/skill.js";
import { SKILL_DOC } from "../../src/util/skill-doc.js";

describe("renderSkillMd", () => {
  it("starts with YAML frontmatter", () => {
    const md = renderSkillMd();
    expect(md.startsWith("---\n")).toBe(true);
    // Frontmatter must be closed
    expect(md.indexOf("---", 3)).toBeGreaterThan(0);
  });

  it("frontmatter contains name and description", () => {
    const md = renderSkillMd();
    const closing = md.indexOf("---", 3);
    const frontmatter = md.slice(0, closing);
    expect(frontmatter).toContain("name: notion-cli");
    expect(frontmatter).toContain("description:");
  });

  it("contains the full SKILL_DOC body", () => {
    expect(renderSkillMd()).toContain(SKILL_DOC);
  });
});

describe("skill install/remove lifecycle", () => {
  let claudeDir: string;

  beforeEach(() => {
    claudeDir = mkdtempSync(join(tmpdir(), "notion-cli-test-"));
  });

  afterEach(() => {
    rmSync(claudeDir, { recursive: true, force: true });
  });

  it("skillFilePath points inside skills/<SKILL_DIRNAME>", () => {
    expect(skillFilePath(claudeDir)).toBe(join(claudeDir, "skills", SKILL_DIRNAME, "SKILL.md"));
  });

  it("installSkill returns created on first install and writes the rendered doc", () => {
    expect(installSkill(claudeDir)).toBe("created");
    const path = skillFilePath(claudeDir);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe(renderSkillMd());
  });

  it("installSkill returns unchanged on repeat install", () => {
    installSkill(claudeDir);
    expect(installSkill(claudeDir)).toBe("unchanged");
  });

  it("installSkill returns updated when the file was modified", () => {
    installSkill(claudeDir);
    const path = skillFilePath(claudeDir);
    writeFileSync(path, readFileSync(path, "utf-8") + "\nstale local edit\n");
    expect(installSkill(claudeDir)).toBe("updated");
    // And it restored the canonical content
    expect(readFileSync(path, "utf-8")).toBe(renderSkillMd());
  });

  it("hasSkill flips true/false around install and remove", () => {
    expect(hasSkill(claudeDir)).toBe(false);
    installSkill(claudeDir);
    expect(hasSkill(claudeDir)).toBe(true);
    removeSkill(claudeDir);
    expect(hasSkill(claudeDir)).toBe(false);
  });

  it("removeSkill returns removed then not_found and deletes the skill directory", () => {
    installSkill(claudeDir);
    expect(removeSkill(claudeDir)).toBe("removed");
    expect(existsSync(join(claudeDir, "skills", SKILL_DIRNAME))).toBe(false);
    expect(removeSkill(claudeDir)).toBe("not_found");
  });
});
