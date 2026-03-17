import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
import { buildIcon, buildCover } from "../../util/build-icon-cover.js";
export function dbCreateCommand() {
    return new Command("create")
        .description("Create a database as a subpage in a parent page.")
        .option("--parent-page-id <id>", "Parent page UUID (required)")
        .option("--title <text>", "Database title")
        .option("--description <text>", "Database description")
        .option("--properties <json>", "Property schema as JSON (initial_data_source.properties)")
        .option("--inline", "Display inline in parent page")
        .option("--icon-emoji <emoji>", "Icon emoji")
        .option("--cover-url <url>", "Cover image URL")
        .option("--stdin", "Read full request body from stdin as JSON")
        .action(withErrorHandling(async (opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let body = {};
        if (opts.stdin) {
            body = (await readStdin());
        }
        // Parent
        if (opts.parentPageId) {
            body.parent = { type: "page_id", page_id: opts.parentPageId };
        }
        // Title
        if (opts.title) {
            body.title = [{ text: { content: opts.title } }];
        }
        // Description
        if (opts.description) {
            body.description = [{ text: { content: opts.description } }];
        }
        // Properties
        if (opts.properties) {
            body.initial_data_source = {
                ...(body.initial_data_source ?? {}),
                properties: JSON.parse(opts.properties),
            };
        }
        // Inline
        if (opts.inline) {
            body.is_inline = true;
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
            throw new Error("--parent-page-id is required");
        }
        const response = await client.databases.create(body);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=create.js.map