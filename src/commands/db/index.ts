import { Command } from "commander";
import { dbGetCommand } from "./get.js";
import { dbCreateCommand } from "./create.js";
import { dbUpdateCommand } from "./update.js";
import { dbQueryCommand } from "./query.js";

export function dbCommand(): Command {
  const cmd = new Command("db").description("Manage Notion databases");

  cmd.addCommand(dbCreateCommand());
  cmd.addCommand(dbGetCommand());
  cmd.addCommand(dbUpdateCommand());
  cmd.addCommand(dbQueryCommand());

  return cmd;
}
