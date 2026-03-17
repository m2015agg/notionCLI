import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";

export function commentsListCommand(): Command {
  return new Command("list")
    .description("List comments on a block or page")
    .argument("<block_id>", "Block or page UUID")
    .option("--page-size <n>", "Results per page (max 100)", "100")
    .option("--start-cursor <cursor>", "Pagination cursor from previous response")
    .option("--all", "Auto-paginate and return all comments")
    .action(
      withErrorHandling(async (blockId: string, opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        const pageSize = Math.min(parseInt(opts.pageSize as string, 10) || 100, 100);

        if (opts.all) {
          const allResults: unknown[] = [];
          let cursor: string | undefined = undefined;

          do {
            const response = await client.comments.list({
              block_id: blockId,
              page_size: pageSize,
              start_cursor: cursor,
            });
            allResults.push(...response.results);
            cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
          } while (cursor);

          outputSuccess(
            {
              object: "list",
              results: allResults,
              has_more: false,
              next_cursor: null,
              type: "comment",
              total: allResults.length,
            },
            json,
          );
        } else {
          const response = await client.comments.list({
            block_id: blockId,
            page_size: pageSize,
            start_cursor: opts.startCursor as string | undefined,
          });
          outputSuccess(response, json);
        }
      }),
    );
}
