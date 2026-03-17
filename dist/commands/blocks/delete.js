import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function blocksDeleteCommand() {
    return new Command("delete")
        .description("Delete a block by ID")
        .argument("<block_id>", "Block UUID")
        .action(withErrorHandling(async (blockId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const response = await client.blocks.delete({ block_id: blockId });
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=delete.js.map