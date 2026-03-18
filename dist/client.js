import { Client } from "@notionhq/client";
const NOTION_API_VERSION = "2025-09-03";
let client = null;
export function getClient() {
    if (client)
        return client;
    const key = getApiKey();
    client = new Client({ auth: key });
    return client;
}
function getApiKey() {
    const key = process.env.NOTION_API_KEY;
    if (!key) {
        const err = {
            error: {
                code: "missing_env",
                message: "NOTION_API_KEY environment variable is not set",
            },
        };
        process.stderr.write(JSON.stringify(err) + "\n");
        process.exit(1);
    }
    return key;
}
/**
 * Raw fetch against the Notion API with the latest API version (2025-09-03).
 * Used for data_sources endpoint which the SDK doesn't support yet.
 */
export async function notionFetch(path, method = "GET", body) {
    const key = getApiKey();
    const opts = {
        method,
        headers: {
            "Authorization": `Bearer ${key}`,
            "Notion-Version": NOTION_API_VERSION,
            "Content-Type": "application/json",
        },
    };
    if (body)
        opts.body = JSON.stringify(body);
    const res = await fetch(`https://api.notion.com/v1/${path}`, opts);
    const json = await res.json();
    if (!res.ok) {
        throw Object.assign(new Error(json.message || `HTTP ${res.status}`), {
            code: json.code,
            status: res.status,
        });
    }
    return json;
}
/**
 * Retrieve a data source (database) using the v2025-09-03 API.
 */
export async function getDataSource(id) {
    return notionFetch(`data_sources/${id}`);
}
//# sourceMappingURL=client.js.map