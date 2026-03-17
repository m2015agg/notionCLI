import { Command } from "commander";
import { blocksGetCommand } from "./get.js";
import { blocksDeleteCommand } from "./delete.js";
import { blocksChildrenCommand } from "./children.js";
import { blocksAppendCommand } from "./append.js";
import { blocksUpdateCommand } from "./update.js";
export function blocksCommand() {
    const cmd = new Command("blocks").description("Manage Notion blocks");
    cmd.addCommand(blocksGetCommand());
    cmd.addCommand(blocksDeleteCommand());
    cmd.addCommand(blocksChildrenCommand());
    cmd.addCommand(blocksAppendCommand());
    cmd.addCommand(blocksUpdateCommand());
    return cmd;
}
//# sourceMappingURL=index.js.map