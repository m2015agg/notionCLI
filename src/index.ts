#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();

program
  .name("notion-cli")
  .description("CLI wrapper for the Notion API. Designed for LLM/AI agent consumption.")
  .version(pkg.version)
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
