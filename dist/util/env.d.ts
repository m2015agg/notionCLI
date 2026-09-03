/**
 * Parse simple KEY=VALUE lines from .env content.
 * Skips blank lines and comments, allows an optional "export " prefix,
 * strips one pair of matching single or double quotes around the value,
 * and ignores malformed lines. No expansion, no dependencies.
 */
export declare function parseDotEnv(content: string): Record<string, string>;
/**
 * True when the current process.env.NOTION_API_KEY value was populated by
 * loadDotEnv() from a project-local .env rather than genuinely exported.
 * Lets commands like `install` avoid persisting a project-scoped key globally.
 */
export declare function keyLoadedFromDotEnv(): boolean;
/**
 * Load NOTION_API_KEY from <dir>/.env if it is not already set.
 * Never overrides existing env vars and never sets any other key —
 * a focused CLI must not pollute the environment.
 */
export declare function loadDotEnv(dir?: string): void;
