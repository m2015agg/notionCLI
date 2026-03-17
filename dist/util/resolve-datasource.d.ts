import type { Client } from "@notionhq/client";
/**
 * Resolves a database_id to its primary data_source_id.
 * SDK v5 uses dataSources.query() which requires data_source_id.
 */
export declare function resolveDataSourceId(client: Client, databaseId: string): Promise<string>;
