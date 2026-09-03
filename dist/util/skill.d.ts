export declare const SKILL_DIRNAME = "notion-cli";
/** Path to the SKILL.md inside a .claude directory (global ~/.claude or a project's .claude). */
export declare function skillFilePath(claudeDir: string): string;
export declare function renderSkillMd(): string;
export declare function installSkill(claudeDir: string): "created" | "updated" | "unchanged";
export declare function removeSkill(claudeDir: string): "removed" | "not_found";
export declare function hasSkill(claudeDir: string): boolean;
