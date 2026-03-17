import { Command } from "commander";
import { commentsCreateCommand } from "./create.js";
import { commentsListCommand } from "./list.js";
import { commentsGetCommand } from "./get.js";
export function commentsCommand() {
    const cmd = new Command("comments").description("Manage Notion comments");
    cmd.addCommand(commentsCreateCommand());
    cmd.addCommand(commentsListCommand());
    cmd.addCommand(commentsGetCommand());
    return cmd;
}
//# sourceMappingURL=index.js.map