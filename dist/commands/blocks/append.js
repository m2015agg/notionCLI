import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
export function blocksAppendCommand() {
    return new Command("append")
        .description("Append child blocks to a block or page")
        .argument("<block_id>", "Block or page UUID")
        .option("--children <json>", "Block children as JSON string")
        .option("--after <block_id>", "Insert after this block")
        .option("--stdin", "Read children from stdin as JSON")
        .action(withErrorHandling(async (blockId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let children;
        if (opts.stdin) {
            const input = (await readStdin());
            children = (input.children ?? input);
        }
        else if (opts.children) {
            children = JSON.parse(opts.children);
        }
        else {
            throw new SyntaxError("Provide --children <json> or --stdin");
        }
        const params = {
            block_id: blockId,
            children,
        };
        if (opts.after) {
            params.after = opts.after;
        }
        const response = await client.blocks.children.append(params);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=append.js.map