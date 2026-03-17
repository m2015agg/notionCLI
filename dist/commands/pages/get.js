import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function pagesGetCommand() {
    return new Command("get")
        .description("Retrieve a page by ID. Returns properties, not content.")
        .argument("<page_id>", "Page UUID")
        .option("--filter-properties <ids>", "Comma-separated property IDs to include")
        .option("--markdown", "Retrieve page content as Markdown")
        .action(withErrorHandling(async (pageId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        if (opts.markdown) {
            const response = await client.pages.retrieveMarkdown({ page_id: pageId });
            outputSuccess(response, json);
            return;
        }
        const params = {
            page_id: pageId,
        };
        if (opts.filterProperties) {
            params.filter_properties = opts.filterProperties.split(",");
        }
        const response = await client.pages.retrieve(params);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=get.js.map