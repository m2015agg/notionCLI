import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
import { buildIcon, buildCover } from "../../util/build-icon-cover.js";
export function pagesCreateCommand() {
    return new Command("create")
        .description("Create a new page under a parent page or database.")
        .option("--parent-page-id <id>", "Parent page UUID")
        .option("--parent-database-id <id>", "Parent database UUID")
        .option("--title <text>", "Page title")
        .option("--properties <json>", "Properties as JSON string")
        .option("--children <json>", "Block children as JSON string (max 100)")
        .option("--markdown <text>", "Page content as markdown")
        .option("--icon-emoji <emoji>", "Icon emoji character")
        .option("--icon-url <url>", "Icon external URL")
        .option("--cover-url <url>", "Cover image URL")
        .option("--stdin", "Read full request body from stdin as JSON")
        .action(withErrorHandling(async (opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let body = {};
        if (opts.stdin) {
            body = (await readStdin());
        }
        // Build parent
        if (opts.parentPageId) {
            body.parent = { type: "page_id", page_id: opts.parentPageId };
        }
        else if (opts.parentDatabaseId) {
            body.parent = { type: "database_id", database_id: opts.parentDatabaseId };
        }
        // Properties
        if (opts.properties) {
            body.properties = JSON.parse(opts.properties);
        }
        // Title shorthand
        if (opts.title) {
            const props = (body.properties ?? {});
            props.title = { title: [{ text: { content: opts.title } }] };
            body.properties = props;
        }
        // Children
        if (opts.children) {
            body.children = JSON.parse(opts.children);
        }
        // Markdown
        if (opts.markdown) {
            body.markdown = opts.markdown;
        }
        // Icon
        const icon = buildIcon(opts);
        if (icon)
            body.icon = icon;
        // Cover
        const cover = buildCover(opts);
        if (cover)
            body.cover = cover;
        if (!body.parent) {
            throw new Error("Either --parent-page-id or --parent-database-id is required");
        }
        const response = await client.pages.create(body);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=create.js.map