import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";

export function filesListCommand(): Command {
  return new Command("list")
    .description("List file uploads")
    .option("--status <status>", "Filter: pending, uploaded, expired, failed")
    .option("--page-size <n>", "Results per page (max 100)", "100")
    .option("--start-cursor <cursor>", "Pagination cursor from previous response")
    .option("--all", "Auto-paginate and return all file uploads")
    .action(
      withErrorHandling(async (opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        const pageSize = Math.min(parseInt(opts.pageSize as string, 10) || 100, 100);

        const buildParams = (cursor?: string) => {
          const params: Record<string, unknown> = {
            page_size: pageSize,
          };

          if (opts.status) {
            params.status = opts.status as string;
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
            const response = await client.fileUploads.list(
              buildParams(cursor) as Parameters<typeof client.fileUploads.list>[0],
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
              type: "file_upload",
              total: allResults.length,
            },
            json,
          );
        } else {
          const params = buildParams(opts.startCursor as string | undefined);
          const response = await client.fileUploads.list(
            params as Parameters<typeof client.fileUploads.list>[0],
          );
          outputSuccess(response, json);
        }
      }),
    );
}
