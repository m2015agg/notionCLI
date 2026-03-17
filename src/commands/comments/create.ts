import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";

export function commentsCreateCommand(): Command {
  return new Command("create")
    .description("Create a comment on a page or block, or reply to a discussion")
    .option("--page-id <id>", "Comment on a page")
    .option("--block-id <id>", "Comment on a block")
    .option("--discussion-id <id>", "Reply to existing discussion")
    .option("--text <text>", "Plain text comment (shorthand)")
    .option("--rich-text <json>", "Rich text as JSON")
    .option("--stdin", "Read full request from stdin as JSON")
    .action(
      withErrorHandling(async (opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        let params: Record<string, unknown>;

        if (opts.stdin) {
          params = (await readStdin()) as Record<string, unknown>;
        } else {
          let richText: unknown[];

          if (opts.richText) {
            richText = JSON.parse(opts.richText as string) as unknown[];
          } else if (opts.text) {
            richText = [{ text: { content: opts.text as string } }];
          } else {
            throw new SyntaxError("Provide --text, --rich-text <json>, or --stdin");
          }

          params = { rich_text: richText };

          if (opts.discussionId) {
            params.discussion_id = opts.discussionId as string;
          } else if (opts.pageId) {
            params.parent = { page_id: opts.pageId as string };
          } else if (opts.blockId) {
            params.parent = { block_id: opts.blockId as string };
          } else {
            throw new SyntaxError(
              "Provide --page-id, --block-id, or --discussion-id (or use --stdin)",
            );
          }
        }

        const response = await client.comments.create(
          params as Parameters<typeof client.comments.create>[0],
        );
        outputSuccess(response, json);
      }),
    );
}
