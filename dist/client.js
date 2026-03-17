import { Client } from "@notionhq/client";
let client = null;
export function getClient() {
    if (client)
        return client;
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
    client = new Client({ auth: key });
    return client;
}
//# sourceMappingURL=client.js.map