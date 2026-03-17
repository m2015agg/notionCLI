import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
import { buildIcon, buildCover } from "../../util/build-icon-cover.js";
export function pagesUpdateCommand() {
    return new Command("update")
        .description("Update page properties, icon, cover, or lock status.")
        .argument("<page_id>", "Page UUID")
        .option("--title <text>", "Update page title")
        .option("--properties <json>", "Properties to update as JSON string")
        .option("--icon-emoji <emoji>", "Update icon emoji")
        .option("--icon-url <url>", "Update icon external URL")
        .option("--cover-url <url>", "Update cover image URL")
        .option("--archive", "Move page to trash")
        .option("--lock", "Lock page")
        .option("--unlock", "Unlock page")
        .option("--stdin", "Read full request body from stdin as JSON")
        .action(withErrorHandling(async (pageId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let body = {};
        if (opts.stdin) {
            body = (await readStdin());
        }
        body.page_id = pageId;
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
        // Icon
        const icon = buildIcon(opts);
        if (icon)
            body.icon = icon;
        // Cover
        const cover = buildCover(opts);
        if (cover)
            body.cover = cover;
        // Archive
        if (opts.archive) {
            body.in_trash = true;
        }
        // Lock
        if (opts.lock) {
            body.is_locked = true;
        }
        else if (opts.unlock) {
            body.is_locked = false;
        }
        const response = await client.pages.update(body);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=update.js.map