import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function dbGetCommand() {
    return new Command("get")
        .description("Retrieve a database schema by ID. Returns structure, not rows.")
        .argument("<database_id>", "Database UUID")
        .action(withErrorHandling(async (databaseId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const response = await client.databases.retrieve({
            database_id: databaseId,
        });
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=get.js.map