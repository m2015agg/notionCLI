import { Command } from "commander";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function filesUploadCommand() {
    return new Command("upload")
        .description("Upload a file to Notion")
        .argument("<filepath>", "Path to file on disk")
        .option("--filename <name>", "Override filename")
        .option("--content-type <mime>", "Override MIME type")
        .action(withErrorHandling(async (filepath, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const filename = opts.filename || basename(filepath);
        const fileBuffer = readFileSync(filepath);
        const createParams = {
            mode: "single_part",
            filename,
        };
        if (opts.contentType) {
            createParams.content_type = opts.contentType;
        }
        const created = await client.fileUploads.create(createParams);
        // Use the content_type from the create response to match during send
        const createdObj = created;
        const blobType = opts.contentType || createdObj.content_type || "application/octet-stream";
        const blob = new Blob([fileBuffer], { type: blobType });
        const sent = await client.fileUploads.send({
            file_upload_id: created.id,
            file: { data: blob, filename },
        });
        // Return the file upload object after send (status: "uploaded")
        // The file can now be attached to pages/blocks via its ID
        outputSuccess(sent, json);
    }));
}
//# sourceMappingURL=upload.js.map