export declare function getMarkedSnippet(): string;
export declare function upsertSection(filePath: string): "created" | "updated" | "unchanged";
export declare function removeSection(filePath: string): "removed" | "not_found";
