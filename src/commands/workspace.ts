import { Command } from "commander";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  openDb, hasDb, searchWorkspace, getAllPages, getAllDatabases,
  getDbProperties, getPage, getDatabase, findDatabaseByQuery,
  buildTree, getBreadcrumb, type TreeNode,
} from "../util/workspace-db.js";
import { getClient } from "../client.js";

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
            // Show breadcrumb path if parent exists
            const breadcrumb = item.parent && item.parent !== "workspace"
              ? getBreadcrumb(db, item.parent)
              : "";
            const path = breadcrumb ? ` [${breadcrumb}]` : "";
            console.log(`    ${item.name}${path} (${item.detail})`);
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
    .description("Show cached database schema (columns, types, select options)")
    .option("--json", "Output as JSON")
    .action((databaseId: string, opts: { json?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const match = findDatabaseByQuery(db, databaseId);
        if (!match) {
          console.error(`Database "${databaseId}" not found in cache.`);
          process.exit(1);
        }

        const properties = getDbProperties(db, match.id);

        if (opts.json) {
          console.log(JSON.stringify({ database: match, properties }, null, 2));
          return;
        }

        console.log(`\n  ${match.icon || ""} ${match.title}\n`);
        console.log(`  ID: ${match.id}`);
        console.log(`  URL: ${match.url}\n`);
        console.log("  | Property | Type | Options/Config |");
        console.log("  |----------|------|----------------|");
        for (const p of properties) {
          const config = p.config ? ` ${p.config}` : "";
          console.log(`  | ${p.name} | ${p.type} |${config} |`);
        }
        console.log();
      } finally {
        db.close();
      }
    });

  cmd
    .command("tree")
    .description("Display page hierarchy as an indented tree")
    .option("--json", "Output as JSON")
    .option("--depth <n>", "Max depth to display", "3")
    .option("--databases-only", "Only show databases (and their parent pages)")
    .action((opts: { json?: boolean; depth: string; databasesOnly?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const roots = buildTree(db);
        const maxDepth = parseInt(opts.depth, 10) || 10;

        if (opts.json) {
          console.log(JSON.stringify(roots, null, 2));
          return;
        }

        // Filter to databases-only if requested
        const filterDbOnly = (nodes: TreeNode[]): TreeNode[] => {
          if (!opts.databasesOnly) return nodes;
          const filtered: TreeNode[] = [];
          for (const node of nodes) {
            if (node.type === "database") {
              filtered.push({ ...node, children: filterDbOnly(node.children) });
            } else {
              const childDbs = filterDbOnly(node.children);
              if (childDbs.length > 0) {
                filtered.push({ ...node, children: childDbs });
              }
            }
          }
          return filtered;
        };

        const filteredRoots = filterDbOnly(roots);

        // Check if all items are roots (no hierarchy data)
        const allPages = getAllPages(db);
        const hasHierarchy = allPages.some((p) => p.parent_id && p.parent_id !== "workspace");
        if (!hasHierarchy && filteredRoots.length > 0) {
          console.log("\n  \u26A0 No hierarchy data. Run `notion-cli snapshot` to get parent-child relationships.\n");
        }

        console.log("\n  \uD83D\uDCC1 Workspace");
        const printNode = (node: TreeNode, prefix: string, isLast: boolean, depth: number) => {
          if (depth > maxDepth) return;
          const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
          const icon = node.icon || (node.type === "database" ? "\uD83D\uDCCA" : "\uD83D\uDCCB");
          const idShort = node.id.slice(0, 8) + "...";
          console.log(`  ${prefix}${connector}${icon} ${node.title} (${idShort})`);
          const sorted = [...node.children].sort((a, b) => {
            if (a.type !== b.type) return a.type === "database" ? -1 : 1;
            return a.title.localeCompare(b.title);
          });
          const childPrefix = prefix + (isLast ? "    " : "\u2502   ");
          for (let i = 0; i < sorted.length; i++) {
            printNode(sorted[i], childPrefix, i === sorted.length - 1, depth + 1);
          }
        };
        const sortedRoots = [...filteredRoots].sort((a, b) => {
          if (a.type !== b.type) return a.type === "database" ? -1 : 1;
          return a.title.localeCompare(b.title);
        });
        for (let i = 0; i < sortedRoots.length; i++) {
          printNode(sortedRoots[i], "", i === sortedRoots.length - 1, 1);
        }
        console.log();
      } finally {
        db.close();
      }
    });

  cmd
    .command("get <query>")
    .description("Search cache and auto-fetch top result's full content")
    .option("--json", "Output as JSON")
    .action(async (query: string, opts: { json?: boolean }) => {
      const cacheDir = join(process.cwd(), CACHE_DIR);
      if (!hasDb(cacheDir)) {
        console.error("No workspace snapshot found. Run: notion-cli snapshot");
        process.exit(1);
      }

      const db = openDb(cacheDir);
      try {
        const results = searchWorkspace(db, query);
        // Filter to pages only (can't fetch database "content" the same way)
        const pageResults = results.filter((r) => r.type === "page");
        if (pageResults.length === 0) {
          // Try database match
          const dbResults = results.filter((r) => r.type === "database");
          if (dbResults.length > 0) {
            const match = findDatabaseByQuery(db, query);
            if (match) {
              const properties = getDbProperties(db, match.id);
              if (opts.json) {
                console.log(JSON.stringify({ database: match, properties }, null, 2));
              } else {
                console.log(`\n  ${match.icon || ""} ${match.title}\n`);
                console.log(`  ID: ${match.id}`);
                console.log(`  URL: ${match.url}\n`);
                for (const p of properties) {
                  console.log(`    ${p.name}: ${p.type}${p.config ? ` (${p.config})` : ""}`);
                }
                console.log();
              }
              return;
            }
          }
          console.error(`No pages found matching "${query}"`);
          process.exit(1);
        }

        // Find the page ID by matching against cached pages
        const topResult = pageResults[0];
        const allPages = getAllPages(db);
        const matchedPage = allPages.find((p) =>
          p.title === topResult.name || p.title.toLowerCase().includes(query.toLowerCase())
        );

        if (!matchedPage) {
          console.error(`Could not resolve page ID for "${topResult.name}"`);
          process.exit(1);
        }

        // Fetch full content via API
        const client = getClient();
        const response = await client.pages.retrieveMarkdown({ page_id: matchedPage.id });

        if (opts.json) {
          console.log(JSON.stringify({
            page: { id: matchedPage.id, title: matchedPage.title, url: matchedPage.url },
            content: response,
          }, null, 2));
        } else {
          console.log(`\n  ${matchedPage.icon || ""} ${matchedPage.title}`);
          console.log(`  ID: ${matchedPage.id}`);
          console.log(`  URL: ${matchedPage.url}\n`);
          const md = (response as Record<string, unknown>).markdown as string | undefined;
          if (md) {
            console.log(md);
          } else {
            console.log(JSON.stringify(response, null, 2));
          }
        }
      } finally {
        db.close();
      }
    });

  return cmd;
}
