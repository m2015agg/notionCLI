import { Command } from "commander";
import { usersMeCommand } from "./me.js";
import { usersListCommand } from "./list.js";

export function usersCommand(): Command {
  const cmd = new Command("users").description("Manage Notion users");

  cmd.addCommand(usersMeCommand());
  cmd.addCommand(usersListCommand());

  return cmd;
}
