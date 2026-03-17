import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
import { queryAll } from "../../util/pagination.js";
import { resolveDataSourceId } from "../../util/resolve-datasource.js";

export function dbQueryCommand(): Command {
  return new Command("query")
    .description("Query database rows with optional filters and sorts. Results are paginated.")
    .argument("<database_id>", "Database UUID")
    .option("--filter <json>", "Filter object as JSON string")
    .option("--sorts <json>", "Sorts array as JSON string")
    .option("--page-size <n>", "Results per page (max 100, default 100)", "100")
    .option("--start-cursor <cursor>", "Pagination cursor from previous response")
    .option("--all", "Auto-paginate and return all results")
    .option("--filter-properties <ids>", "Comma-separated property IDs to include")
    .option("--stdin", "Read full query body from stdin as JSON")
    .action(
      withErrorHandling(
        async (databaseId: string, opts: Record<string, unknown>, cmd: Command) => {
          const client = getClient();
          const json = isJsonMode(cmd);

          let body: Record<string, unknown> = {};

          if (opts.stdin) {
            body = (await readStdin()) as Record<string, unknown>;
          }

          // Filter
          if (opts.filter) {
            body.filter = JSON.parse(opts.filter as string);
          }

          // Sorts
          if (opts.sorts) {
            body.sorts = JSON.parse(opts.sorts as string);
          }

          // Filter properties
          const filterProperties = opts.filterProperties
            ? (opts.filterProperties as string).split(",")
            : undefined;

          const pageSize = Math.min(parseInt(opts.pageSize as string, 10) || 100, 100);

          // Resolve database_id to data_source_id for SDK v5
          const dataSourceId = await resolveDataSourceId(client, databaseId);

          if (opts.all) {
            const result = await queryAll(client, {
              data_source_id: dataSourceId,
              filter: body.filter,
              sorts: body.sorts,
              page_size: pageSize,
              filter_properties: filterProperties,
            });
            outputSuccess(
              {
                object: "list",
                results: result.results,
                has_more: false,
                next_cursor: null,
                type: "page_or_database",
                total: result.total,
              },
              json,
            );
          } else {
            const response = await client.dataSources.query({
              data_source_id: dataSourceId,
              filter: body.filter as Parameters<typeof client.dataSources.query>[0]["filter"],
              sorts: body.sorts as Parameters<typeof client.dataSources.query>[0]["sorts"],
              page_size: pageSize,
              start_cursor: opts.startCursor as string | undefined,
              filter_properties: filterProperties,
            });
            outputSuccess(response, json);
          }
        },
      ),
    );
}
