import { Command } from "commander";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";

export function filesUploadCommand(): Command {
  return new Command("upload")
    .description("Upload a file to Notion")
    .argument("<filepath>", "Path to file on disk")
    .option("--filename <name>", "Override filename")
    .option("--content-type <mime>", "Override MIME type")
    .action(
      withErrorHandling(
        async (filepath: string, opts: Record<string, unknown>, cmd: Command) => {
          const client = getClient();
          const json = isJsonMode(cmd);

          const filename = (opts.filename as string) || basename(filepath);
          const fileBuffer = readFileSync(filepath);

          const createParams: Record<string, unknown> = {
            mode: "single_part",
            filename,
          };

          if (opts.contentType) {
            createParams.content_type = opts.contentType as string;
          }

          const created = await client.fileUploads.create(
            createParams as Parameters<typeof client.fileUploads.create>[0],
          );

          // Use the content_type from the create response to match during send
          const createdObj = created as unknown as { content_type?: string };
          const blobType = (opts.contentType as string) || createdObj.content_type || "application/octet-stream";
          const blob = new Blob([fileBuffer], { type: blobType });
          const sent = await client.fileUploads.send({
            file_upload_id: created.id,
            file: { data: blob, filename },
          } as Parameters<typeof client.fileUploads.send>[0]);

          // Return the file upload object after send (status: "uploaded")
          // The file can now be attached to pages/blocks via its ID
          outputSuccess(sent, json);
        },
      ),
    );
}
