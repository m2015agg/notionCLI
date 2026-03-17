#!/usr/bin/env node
import { Command } from "commander";
import { pagesCommand } from "./commands/pages/index.js";
import { dbCommand } from "./commands/db/index.js";
import { blocksCommand } from "./commands/blocks/index.js";
import { docsCommand } from "./commands/docs.js";
import { installCommand } from "./commands/install.js";
import { initCommand } from "./commands/init.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { commentsCommand } from "./commands/comments/index.js";
import { searchCommand } from "./commands/search.js";
import { filesCommand } from "./commands/files/index.js";
import { usersCommand } from "./commands/users/index.js";
const program = new Command();
program
    .name("notion-cli")
    .description("CLI wrapper for the Notion API. Designed for LLM/AI agent consumption.")
    .version("0.1.0")
    .option("--json", "Output as structured JSON (default when piped)");
program.addCommand(pagesCommand());
program.addCommand(dbCommand());
program.addCommand(blocksCommand());
program.addCommand(docsCommand());
program.addCommand(commentsCommand());
program.addCommand(searchCommand());
program.addCommand(filesCommand());
program.addCommand(usersCommand());
program.addCommand(installCommand());
program.addCommand(initCommand());
program.addCommand(uninstallCommand());
program.parse();
//# sourceMappingURL=index.js.map