export declare function getMarkedSnippet(): string;
export declare function getPointerSnippet(): string;
/** True when the file has a marker-delimited notion-cli section (pointer or full doc). */
export declare function hasMarkerSection(filePath: string): boolean;
/** True when the file's marker section contains the legacy full command reference
 *  (as written by pre-0.6 installs or `install --claude-md`), not just the pointer. */
export declare function hasFullDocSection(filePath: string): boolean;
export declare function upsertSection(filePath: string, snippet?: string): "created" | "updated" | "unchanged";
export declare function removeSection(filePath: string): "removed" | "not_found";
