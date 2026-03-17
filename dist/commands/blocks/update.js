import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
export function blocksUpdateCommand() {
    return new Command("update")
        .description("Update a block by ID")
        .argument("<block_id>", "Block UUID")
        .option("--content <json>", "Block type content as JSON string")
        .option("--archive", "Soft delete (set in_trash=true)")
        .option("--stdin", "Read full update body from stdin as JSON")
        .action(withErrorHandling(async (blockId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let body = {};
        if (opts.stdin) {
            body = (await readStdin());
        }
        if (opts.content) {
            const content = JSON.parse(opts.content);
            body = { ...body, ...content };
        }
        if (opts.archive) {
            body.in_trash = true;
        }
        const response = await client.blocks.update({
            block_id: blockId,
            ...body,
        });
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=update.js.map