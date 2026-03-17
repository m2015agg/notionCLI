import { Command } from "commander";
import { filesUploadCommand } from "./upload.js";
import { filesGetCommand } from "./get.js";
import { filesListCommand } from "./list.js";
export function filesCommand() {
    const cmd = new Command("files").description("Manage Notion file uploads");
    cmd.addCommand(filesUploadCommand());
    cmd.addCommand(filesGetCommand());
    cmd.addCommand(filesListCommand());
    return cmd;
}
//# sourceMappingURL=index.js.map