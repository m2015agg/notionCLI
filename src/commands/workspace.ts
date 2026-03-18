import { Command } from "commander";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  openDb, hasDb, searchWorkspace, getAllPages, getAllDatabases,
  getDbProperties, getPage, getDatabase,
} from "../util/workspace-db.js";

const CACHE_DIR = ".notion-cache";

export function workspaceCommand(): Command {
  const cmd = new Command("workspace")
    .description("Search and explore cached Notion workspace");

  cmd
    .command("search <query>")
    .description("FTS5 search across cached pages, databases, and properties")
    .option("--json", "Output as JSON")
    .action((query: string, opts: { json?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const results = searchWorkspace(db, query);

        if (opts.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        console.log(`\n  ${results.length} match(es) for "${query}":\n`);

        const grouped = new Map<string, typeof results>();
        for (const r of results) {
          if (!grouped.has(r.type)) grouped.set(r.type, []);
          grouped.get(r.type)!.push(r);
        }

        for (const [type, items] of grouped) {
          console.log(`  ${type.toUpperCase()}S:`);
          for (const item of items) {
            console.log(`    ${item.name} (${item.detail})`);
          }
          console.log();
        }
      } finally {
        db.close();
      }
    });

  cmd
    .command("pages")
    .description("List all cached pages")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const pages = getAllPages(db);

        if (opts.json) {
          console.log(JSON.stringify(pages, null, 2));
          return;
        }

        console.log(`\n  ${pages.length} page(s):\n`);
        for (const p of pages) {
          const icon = p.icon || " ";
          console.log(`  ${icon} ${p.title} (${p.id.slice(0, 8)}...)`);
        }
        console.log();
      } finally {
        db.close();
      }
    });

  cmd
    .command("databases")
    .description("List all cached databases")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const databases = getAllDatabases(db);

        if (opts.json) {
          console.log(JSON.stringify(databases, null, 2));
          return;
        }

        console.log(`\n  ${databases.length} database(s):\n`);
        for (const d of databases) {
          const icon = d.icon || " ";
          const props = getDbProperties(db, d.id);
          console.log(`  ${icon} ${d.title} — ${props.length} properties (${d.id.slice(0, 8)}...)`);
        }
        console.log();
      } finally {
        db.close();
      }
    });

  cmd
    .command("schema <database_id>")
    .description("Show cached database schema (properties and types)")
    .option("--json", "Output as JSON")
    .action((databaseId: string, opts: { json?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const database = getDatabase(db, databaseId);
        const properties = getDbProperties(db, databaseId);

        if (!database && properties.length === 0) {
          // Try partial match
          const allDbs = getAllDatabases(db);
          const match = allDbs.find((d) =>
            d.id.includes(databaseId) || d.title.toLowerCase().includes(databaseId.toLowerCase())
          );
          if (match) {
            const matchProps = getDbProperties(db, match.id);
            if (opts.json) {
              console.log(JSON.stringify({ database: match, properties: matchProps }, null, 2));
              return;
            }
            console.log(`\n  ${match.icon || ""} ${match.title}\n`);
            console.log(`  ID: ${match.id}`);
            console.log(`  URL: ${match.url}\n`);
            console.log("  | Property | Type |");
            console.log("  |----------|------|");
            for (const p of matchProps) {
              console.log(`  | ${p.name} | ${p.type} |`);
            }
            console.log();
            return;
          }
          console.error(`Database "${databaseId}" not found in cache.`);
          process.exit(1);
        }

        if (opts.json) {
          console.log(JSON.stringify({ database, properties }, null, 2));
          return;
        }

        console.log(`\n  ${database?.icon || ""} ${database?.title || databaseId}\n`);
        if (database) {
          console.log(`  ID: ${database.id}`);
          console.log(`  URL: ${database.url}\n`);
        }
        console.log("  | Property | Type |");
        console.log("  |----------|------|");
        for (const p of properties) {
          console.log(`  | ${p.name} | ${p.type} |`);
        }
        console.log();
      } finally {
        db.close();
      }
    });

  return cmd;
}
