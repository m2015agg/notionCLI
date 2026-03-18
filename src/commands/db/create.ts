import { Command } from "commander";
import { getClient } from "../../client.js";
import { isJsonMode, outputSuccess } from "../../output.js";
import { withErrorHandling } from "../../errors.js";
import { readStdin } from "../../util/stdin.js";
import { buildIcon, buildCover } from "../../util/build-icon-cover.js";

export function dbCreateCommand(): Command {
  return new Command("create")
    .description("Create a database as a subpage in a parent page.")
    .option("--parent-page-id <id>", "Parent page UUID (required)")
    .option("--title <text>", "Database title")
    .option("--description <text>", "Database description")
    .option("--properties <json>", "Property schema as JSON (initial_data_source.properties)")
    .option("--schema <ddl>", 'Simple DDL: "Name TITLE, Status SELECT(\'To Do\',\'Done\'), Priority NUMBER"')
    .option("--inline", "Display inline in parent page")
    .option("--icon-emoji <emoji>", "Icon emoji")
    .option("--cover-url <url>", "Cover image URL")
    .option("--stdin", "Read full request body from stdin as JSON")
    .action(
      withErrorHandling(async (opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const json = isJsonMode(cmd);

        let body: Record<string, unknown> = {};

        if (opts.stdin) {
          body = (await readStdin()) as Record<string, unknown>;
        }

        // Parent
        if (opts.parentPageId) {
          body.parent = { type: "page_id", page_id: opts.parentPageId };
        }

        // Title
        if (opts.title) {
          body.title = [{ text: { content: opts.title } }];
        }

        // Description
        if (opts.description) {
          body.description = [{ text: { content: opts.description } }];
        }

        // Properties
        if (opts.properties) {
          body.initial_data_source = {
            ...((body.initial_data_source as Record<string, unknown>) ?? {}),
            properties: JSON.parse(opts.properties as string),
          };
        }

        // Schema DDL shorthand: "Name TITLE, Status SELECT('To Do','Done'), Priority NUMBER"
        if (opts.schema && !opts.properties) {
          const props = parseSchemaDDL(opts.schema as string);
          body.initial_data_source = {
            ...((body.initial_data_source as Record<string, unknown>) ?? {}),
            properties: props,
          };
        }

        // Inline
        if (opts.inline) {
          body.is_inline = true;
        }

        // Icon
        const icon = buildIcon(opts);
        if (icon) body.icon = icon;

        // Cover
        const cover = buildCover(opts);
        if (cover) body.cover = cover;

        if (!body.parent) {
          throw new Error("--parent-page-id is required");
        }

        const response = await client.databases.create(
          body as Parameters<typeof client.databases.create>[0],
        );
        outputSuccess(response, json);
      }),
    );
}

/**
 * Parse simple DDL string into Notion property schema.
 * Format: "Name TITLE, Status SELECT('To Do','Done'), Priority NUMBER, Due DATE"
 * Supported types: TITLE, TEXT (rich_text), NUMBER, SELECT, MULTI_SELECT, DATE,
 *                  CHECKBOX, URL, EMAIL, PHONE, PEOPLE, FILES, RELATION
 */
function parseSchemaDDL(ddl: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Split by comma, but not commas inside parentheses
  const columns = splitOutsideParens(ddl, ",");

  for (const col of columns) {
    const trimmed = col.trim();
    if (!trimmed) continue;

    // Match: "ColumnName TYPE" or "ColumnName TYPE('opt1','opt2')"
    const match = trimmed.match(/^(.+?)\s+(TITLE|TEXT|RICH_TEXT|NUMBER|SELECT|MULTI_SELECT|DATE|CHECKBOX|URL|EMAIL|PHONE|PEOPLE|FILES|RELATION)(?:\((.+)\))?$/i);
    if (!match) {
      throw new Error(`Invalid schema column: "${trimmed}". Expected format: "Name TYPE" or "Name SELECT('opt1','opt2')"`);
    }

    const [, name, typeRaw, optionsRaw] = match;
    const type = typeRaw.toLowerCase();

    switch (type) {
      case "title":
        props[name.trim()] = { title: {} };
        break;
      case "text":
      case "rich_text":
        props[name.trim()] = { rich_text: {} };
        break;
      case "number":
        props[name.trim()] = { number: { format: "number" } };
        break;
      case "select": {
        const options = parseOptions(optionsRaw);
        props[name.trim()] = { select: { options: options.map((o) => ({ name: o })) } };
        break;
      }
      case "multi_select": {
        const options = parseOptions(optionsRaw);
        props[name.trim()] = { multi_select: { options: options.map((o) => ({ name: o })) } };
        break;
      }
      case "date":
        props[name.trim()] = { date: {} };
        break;
      case "checkbox":
        props[name.trim()] = { checkbox: {} };
        break;
      case "url":
        props[name.trim()] = { url: {} };
        break;
      case "email":
        props[name.trim()] = { email: {} };
        break;
      case "phone":
        props[name.trim()] = { phone_number: {} };
        break;
      case "people":
        props[name.trim()] = { people: {} };
        break;
      case "files":
        props[name.trim()] = { files: {} };
        break;
      case "relation": {
        if (!optionsRaw) {
          throw new Error(`RELATION requires a database ID: "Name RELATION(database_id)"`);
        }
        const dbId = optionsRaw.trim().replace(/^['"]|['"]$/g, "");
        props[name.trim()] = { relation: { database_id: dbId, single_property: {} } };
        break;
      }
      default:
        throw new Error(`Unsupported column type: "${type}"`);
    }
  }

  return props;
}

function splitOutsideParens(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === delimiter && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function parseOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  // Parse 'opt1','opt2' or "opt1","opt2" or opt1,opt2
  return raw.split(",").map((o) => o.trim().replace(/^['"]|['"]$/g, ""));
}
