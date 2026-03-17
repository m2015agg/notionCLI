import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
export function filesGetCommand() {
    return new Command("get")
        .description("Retrieve a file upload by ID")
        .argument("<file_upload_id>", "File upload UUID")
        .action(withErrorHandling(async (fileUploadId, opts, cmd) => {
        const client = getClient();
        const json = isJsonMode(cmd);
        const response = await client.fileUploads.retrieve({ file_upload_id: fileUploadId });
        outputSuccess(response, json);
    }));
}
//# sourceMappingURL=get.js.map