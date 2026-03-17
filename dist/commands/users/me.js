import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function usersMeCommand() {
    return new Command("me")
        .description("Retrieve the current bot user")
        .action(withErrorHandling(async (opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const response = await client.users.me({});
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=me.js.map