import type { Client } from "@notionhq/client";
interface QueryParams {
    data_source_id: string;
    filter?: unknown;
    sorts?: unknown;
    page_size?: number;
    filter_properties?: string[];
}
export declare function queryAll(client: Client, params: QueryParams): Promise<{
    results: unknown[];
    total: number;
}>;
export {};
