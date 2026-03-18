import { Client } from "@notionhq/client";
export declare function getClient(): Client;
/**
 * Raw fetch against the Notion API with the latest API version (2025-09-03).
 * Used for data_sources endpoint which the SDK doesn't support yet.
 */
export declare function notionFetch(path: string, method?: string, body?: unknown): Promise<unknown>;
/**
 * Retrieve a data source (database) using the v2025-09-03 API.
 */
export declare function getDataSource(id: string): Promise<Record<string, unknown>>;
