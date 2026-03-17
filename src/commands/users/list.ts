import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";

export function usersListCommand(): Command {
  return new Command("list")
    .description("List all users in the workspace")
    .option("--page-size <n>", "Results per page (max 100)", "100")
    .option("--start-cursor <cursor>", "Pagination cursor from previous response")
    .option("--all", "Auto-paginate and return all users")
    .action(
      withErrorHandling(async (opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        const pageSize = Math.min(parseInt(opts.pageSize as string, 10) || 100, 100);

        if (opts.all) {
          const allResults: unknown[] = [];
          let cursor: string | undefined = undefined;

          do {
            const response = await client.users.list({
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
              type: "user",
              total: allResults.length,
            },
            json,
          );
        } else {
          const response = await client.users.list({
            page_size: pageSize,
            start_cursor: opts.startCursor as string | undefined,
          });
          outputSuccess(response, json);
        }
      }),
    );
}
