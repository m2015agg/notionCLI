import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";

export function blocksAppendCommand(): Command {
  return new Command("append")
    .description("Append child blocks to a block or page")
    .argument("<block_id>", "Block or page UUID")
    .option("--children <json>", "Block children as JSON string")
    .option("--after <block_id>", "Insert after this block")
    .option("--stdin", "Read children from stdin as JSON")
    .action(
      withErrorHandling(async (blockId: string, opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        let children: unknown[];

        if (opts.stdin) {
          const input = (await readStdin()) as Record<string, unknown>;
          children = (input.children ?? input) as unknown[];
        } else if (opts.children) {
          children = JSON.parse(opts.children as string) as unknown[];
        } else {
          throw new SyntaxError("Provide --children <json> or --stdin");
        }

        const params: Record<string, unknown> = {
          block_id: blockId,
          children,
        };

        if (opts.after) {
          params.after = opts.after as string;
        }

        const response = await client.blocks.children.append(
          params as Parameters<typeof client.blocks.children.append>[0],
        );
        outputSuccess(response, json);
      }),
    );
}
