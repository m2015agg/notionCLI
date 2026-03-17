import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
export function commentsCreateCommand() {
    return new Command("create")
        .description("Create a comment on a page or block, or reply to a discussion")
        .option("--page-id <id>", "Comment on a page")
        .option("--block-id <id>", "Comment on a block")
        .option("--discussion-id <id>", "Reply to existing discussion")
        .option("--text <text>", "Plain text comment (shorthand)")
        .option("--rich-text <json>", "Rich text as JSON")
        .option("--stdin", "Read full request from stdin as JSON")
        .action(withErrorHandling(async (opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        let params;
        if (opts.stdin) {
            params = (await readStdin());
        }
        else {
            let richText;
            if (opts.richText) {
                richText = JSON.parse(opts.richText);
            }
            else if (opts.text) {
                richText = [{ text: { content: opts.text } }];
            }
            else {
                throw new SyntaxError("Provide --text, --rich-text <json>, or --stdin");
            }
            params = { rich_text: richText };
            if (opts.discussionId) {
                params.discussion_id = opts.discussionId;
            }
            else if (opts.pageId) {
                params.parent = { page_id: opts.pageId };
            }
            else if (opts.blockId) {
                params.parent = { block_id: opts.blockId };
            }
            else {
                throw new SyntaxError("Provide --page-id, --block-id, or --discussion-id (or use --stdin)");
            }
        }
        const response = await client.comments.create(params);
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=create.js.map