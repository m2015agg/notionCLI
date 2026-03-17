import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function blocksChildrenCommand() {
    return new Command("children")
        .description("List child blocks of a block or page")
        .argument("<block_id>", "Block or page UUID")
        .option("--page-size <n>", "Results per page (max 100)", "100")
        .option("--start-cursor <cursor>", "Pagination cursor from previous response")
        .option("--all", "Auto-paginate and return all children")
        .action(withErrorHandling(async (blockId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const pageSize = Math.min(parseInt(opts.pageSize, 10) || 100, 100);
        if (opts.all) {
            const allResults = [];
            let cursor = undefined;
            do {
                const response = await client.blocks.children.list({
                    block_id: blockId,
                    page_size: pageSize,
                    start_cursor: cursor,
                });
                allResults.push(...response.results);
                cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
            } while (cursor);
            outputSuccess({
                object: "list",
                results: allResults,
                has_more: false,
                next_cursor: null,
                type: "block",
                total: allResults.length,
            }, json);
        }
        else {
            const response = await client.blocks.children.list({
                block_id: blockId,
                page_size: pageSize,
                start_cursor: opts.startCursor,
            });
            outputSuccess(response, json);
        }
    }));
}
//# sourceMappingURL=children.js.map