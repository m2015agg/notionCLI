import { Command } from "commander";
import { pagesGetCommand } from "./get.js";
import { pagesCreateCommand } from "./create.js";
import { pagesUpdateCommand } from "./update.js";
export function pagesCommand() {
    const cmd = new Command("pages").description("Manage Notion pages");
    cmd.addCommand(pagesCreateCommand());
    cmd.addCommand(pagesGetCommand());
    cmd.addCommand(pagesUpdateCommand());
    return cmd;
}
//# sourceMappingURL=index.js.map