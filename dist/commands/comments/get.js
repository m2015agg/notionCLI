import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function commentsGetCommand() {
    return new Command("get")
        .description("Retrieve a comment by ID")
        .argument("<comment_id>", "Comment UUID")
        .action(withErrorHandling(async (commentId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const response = await client.comments.retrieve({ comment_id: commentId });
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=get.js.map