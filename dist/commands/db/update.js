import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
import { buildIcon, buildCover } from "../../util/build-icon-cover.js";
export function dbUpdateCommand() {
    return new Command("update")
        .description("Update database title, description, icon, cover, or lock status.")
        .argument("<database_id>", "Database UUID")
        .option("--title <text>", "Update database title")
        .option("--description <text>", "Update description")
        .option("--icon-emoji <emoji>", "Update icon emoji")
        .option("--cover-url <url>", "Update cover image URL")
        .option("--archive", "Move to trash")
        .option("--lock", "Lock from UI editing")
        .option("--unlock", "Unlock")
        .option("--stdin", "Read full request body from stdin as JSON")
        .action(withErrorHandling(async (databaseId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let body = {};
        if (opts.stdin) {
            body = (await readStdin());
        }
        body.database_id = databaseId;
        // Title
        if (opts.title) {
            body.title = [{ text: { content: opts.title } }];
        }
        // Description
        if (opts.description) {
            body.description = [{ text: { content: opts.description } }];
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
        const response = await client.databases.update(body);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=update.js.map