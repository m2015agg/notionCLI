import { Command } from "commander";
import { getClient } from "../client.js";
import { isJsonMode, outputSuccess } from "../output.js";
import { withErrorHandling } from "../errors.js";

export function searchCommand(): Command {
  return new Command("search")
    .description("Search pages and databases by title")
    .argument("[query]", "Search query string")
    .option("--filter-type <type>", 'Filter: "page" or "database"')
    .option("--sort-direction <dir>", '"ascending" or "descending"')
    .option("--page-size <n>", "Results per page (max 100)", "100")
    .option("--start-cursor <cursor>", "Pagination cursor from previous response")
    .option("--all", "Auto-paginate and return all results")
    .action(
      withErrorHandling(
        async (query: string | undefined, opts: Record<string, unknown>, cmd: Command) => {
          const client = getClient();
          const json = isJsonMode(cmd);

          const pageSize = Math.min(parseInt(opts.pageSize as string, 10) || 100, 100);

          const buildParams = (cursor?: string) => {
            const params: Record<string, unknown> = {
              page_size: pageSize,
            };

            if (query) {
              params.query = query;
            }

            if (opts.filterType) {
              const value =
                opts.filterType === "database" ? "data_source" : (opts.filterType as string);
              params.filter = { property: "object", value };
            }

            if (opts.sortDirection) {
              params.sort = {
                timestamp: "last_edited_time",
                direction: opts.sortDirection as string,
              };
            }

            if (cursor) {
              params.start_cursor = cursor;
            }

            return params;
          };

          if (opts.all) {
            const allResults: unknown[] = [];
            let cursor: string | undefined = undefined;

            do {
              const response = await client.search(
                buildParams(cursor) as Parameters<typeof client.search>[0],
              );
              allResults.push(...response.results);
              cursor =
                response.has_more && response.next_cursor ? response.next_cursor : undefined;
            } while (cursor);

            outputSuccess(
              {
                object: "list",
                results: allResults,
                has_more: false,
                next_cursor: null,
                total: allResults.length,
              },
              json,
            );
          } else {
            const params = buildParams(opts.startCursor as string | undefined);
            const response = await client.search(
              params as Parameters<typeof client.search>[0],
            );
            outputSuccess(response, json);
          }
        },
      ),
    );
}
