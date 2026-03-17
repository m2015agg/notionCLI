import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";

export function blocksGetCommand(): Command {
  return new Command("get")
    .description("Retrieve a block by ID")
    .argument("<block_id>", "Block UUID")
    .action(
      withErrorHandling(async (blockId: string, opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        const response = await client.blocks.retrieve({ block_id: blockId });
        outputSuccess(response, json);
      }),
    );
}
