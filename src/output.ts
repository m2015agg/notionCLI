import type { Command } from "commander";

export function isJsonMode(cmd: Command): boolean {
  const opts = cmd.optsWithGlobals();
  if (opts.json === true) return true;
  if (opts.json === false) return false;
  // Default to JSON when stdout is not a TTY (piped)
  return !process.stdout.isTTY;
}

export function outputSuccess(data: unknown, json: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else {
    // Simple human-readable: pretty-print the object
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.object === "page") {
        printPage(obj);
      } else if (obj.object === "database") {
        printDatabase(obj);
      } else if (obj.object === "list") {
        printList(obj);
      } else {
        process.stdout.write(JSON.stringify(data, null, 2) + "\n");
      }
    } else {
      process.stdout.write(String(data) + "\n");
    }
  }
}

export function outputError(
  error: { code: string; message: string; status?: number },
  json: boolean,
): void {
  if (json) {
    process.stderr.write(JSON.stringify({ error }) + "\n");
  } else {
    const status = error.status ? ` (${error.status})` : "";
    process.stderr.write(`Error [${error.code}]${status}: ${error.message}\n`);
  }
}

function printPage(page: Record<string, unknown>): void {
  process.stdout.write(`Page: ${page.id}\n`);
  if (page.url) process.stdout.write(`URL: ${page.url}\n`);
  const props = page.properties as Record<string, unknown> | undefined;
  if (props) {
    process.stdout.write("Properties:\n");
    for (const [key, val] of Object.entries(props)) {
      process.stdout.write(`  ${key}: ${JSON.stringify(val)}\n`);
    }
  }
}

function printDatabase(db: Record<string, unknown>): void {
  process.stdout.write(`Database: ${db.id}\n`);
  if (db.url) process.stdout.write(`URL: ${db.url}\n`);
  const title = db.title as Array<{ plain_text?: string }> | undefined;
  if (title?.length) {
    process.stdout.write(
      `Title: ${title.map((t) => t.plain_text).join("")}\n`,
    );
  }
}

function printList(list: Record<string, unknown>): void {
  const results = list.results as unknown[];
  process.stdout.write(`Results: ${results?.length ?? 0}\n`);
  if (list.has_more) process.stdout.write(`Has more: true\n`);
  if (results) {
    for (const item of results) {
      const obj = item as Record<string, unknown>;
      process.stdout.write(`  - ${obj.id}\n`);
    }
  }
}
