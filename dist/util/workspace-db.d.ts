import Database from "better-sqlite3";
export declare function openDb(cacheDir: string): Database.Database;
export declare function hasDb(cacheDir: string): boolean;
export declare function clearData(db: Database.Database): void;
export declare function setMetadata(db: Database.Database, key: string, value: string): void;
export declare function getMetadata(db: Database.Database, key: string): string | undefined;
export interface PageRow {
    id: string;
    title: string;
    type: string;
    parent_type: string;
    parent_id: string;
    url: string;
    icon: string | null;
    last_edited: string;
    created: string;
}
export interface DatabaseRow {
    id: string;
    title: string;
    parent_type: string;
    parent_id: string;
    url: string;
    icon: string | null;
    last_edited: string;
    row_count: number;
}
export interface DbPropertyRow {
    database_id: string;
    name: string;
    type: string;
    config: string | null;
}
export declare function insertPages(db: Database.Database, pages: PageRow[]): void;
export declare function insertDatabases(db: Database.Database, databases: DatabaseRow[], properties: DbPropertyRow[]): void;
export interface FtsResult {
    name: string;
    type: string;
    parent: string;
    detail: string;
    rank: number;
}
export declare function searchWorkspace(db: Database.Database, query: string): FtsResult[];
export declare function getAllPages(db: Database.Database): PageRow[];
export declare function getAllDatabases(db: Database.Database): DatabaseRow[];
export declare function getDbProperties(db: Database.Database, databaseId: string): DbPropertyRow[];
export declare function getPage(db: Database.Database, id: string): PageRow | undefined;
export declare function getDatabase(db: Database.Database, id: string): DatabaseRow | undefined;
