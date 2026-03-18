import { Command } from "commander";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { getClient, getDataSource } from "../client.js";
import {
  openDb, clearData, setMetadata, insertPages, insertDatabases,
  type PageRow, type DatabaseRow, type DbPropertyRow,
} from "../util/workspace-db.js";

function write(msg: string): void {
  process.stdout.write(msg);
}

function extractTitle(page: Record<string, unknown>): string {
  const properties = page.properties as Record<string, { type?: string; title?: Array<{ plain_text: string }> }> | undefined;
  if (!properties) return "(untitled)";
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && prop.title) {
      return prop.title.map((t) => t.plain_text).join("") || "(untitled)";
    }
  }
  return "(untitled)";
}

function getIcon(item: Record<string, unknown>): string | null {
  const icon = item.icon as { type?: string; emoji?: string } | undefined;
  if (icon?.type === "emoji") return icon.emoji || null;
  return null;
}

export function snapshotCommand(): Command {
  return new Command("snapshot")
    .description("Snapshot Notion workspace structure to local .notion-cache/ for fast lookups")
    .option("--output <dir>", "Output directory", ".notion-cache")
    .action(async (opts: { output: string }) => {
      write("\n  Snapshotting Notion workspace...\n");

      const client = getClient();

      // Paginate through all shared pages
      write("  Fetching pages... ");
      const allPages: Record<string, unknown>[] = [];
      const seenPageIds = new Set<string>();

      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        const response = await client.search({
          start_cursor: startCursor,
          page_size: 100,
          filter: { property: "object", value: "page" },
        });

        for (const item of response.results) {
          const obj = item as unknown as Record<string, unknown>;
          if (!seenPageIds.has(obj.id as string)) {
            seenPageIds.add(obj.id as string);
            allPages.push(obj);
          }
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;
      }
      write(`\u2713 ${allPages.length} pages\n`);

      // Fetch databases via 3 methods: search filter, page parent discovery, direct retrieve
      write("  Fetching databases... ");
      const allDatabases: Record<string, unknown>[] = [];
      const seenDbIds = new Set<string>();

      // Method 1: search API with data_source filter (connected/external databases)
      hasMore = true;
      startCursor = undefined;
      while (hasMore) {
        try {
          const response = await client.search({
            start_cursor: startCursor,
            page_size: 100,
            filter: { property: "object", value: "data_source" as any },
          });
          for (const item of response.results) {
            const obj = item as unknown as Record<string, unknown>;
            if (!seenDbIds.has(obj.id as string)) {
              seenDbIds.add(obj.id as string);
              allDatabases.push(obj);
            }
          }
          hasMore = response.has_more;
          startCursor = response.next_cursor || undefined;
        } catch {
          hasMore = false;
        }
      }

      // Method 2: discover databases from page parents (data_source_id type)
      const discoveredDbIds = new Set<string>();
      for (const page of allPages) {
        const parent = page.parent as { type?: string; data_source_id?: string; database_id?: string } | undefined;
        if (parent?.type === "data_source_id" && parent.data_source_id) {
          discoveredDbIds.add(parent.data_source_id);
        } else if (parent?.type === "database_id" && parent.database_id) {
          discoveredDbIds.add(parent.database_id);
        }
      }

      // Method 3: retrieve each discovered data source via v2025-09-03 API
      let accessible = 0;
      let inaccessible = 0;
      for (const dbId of discoveredDbIds) {
        if (seenDbIds.has(dbId)) continue;
        try {
          const obj = await getDataSource(dbId);
          seenDbIds.add(dbId);
          allDatabases.push(obj);
          accessible++;
        } catch {
          inaccessible++;
        }
      }

      write(`\u2713 ${allDatabases.length} databases`);
      if (inaccessible > 0) {
        write(` (${inaccessible} inaccessible \u2014 share them with your integration)`);
      }
      write("\n");

      if (allDatabases.length === 0) {
        write("  (No databases found — ensure databases are shared with the integration)\n");
      }

      // Fetch database schemas
      write("  Fetching database schemas... ");
      const dbProperties: DbPropertyRow[] = [];
      const dbSchemas = new Map<string, Record<string, unknown>>();
      for (const db of allDatabases) {
        try {
          // Use the data_source API (v2025-09-03) for schema retrieval
          const schemaObj = await getDataSource(db.id as string);
          dbSchemas.set(db.id as string, schemaObj);
          const props = schemaObj.properties as Record<string, Record<string, unknown>> | undefined;
          if (props) {
            for (const [name, prop] of Object.entries(props)) {
              // Extract config for select/multi_select options
              let config: string | null = null;
              if (prop.type === "select" && prop.select) {
                const sel = prop.select as { options?: Array<{ name: string; color?: string }> };
                if (sel.options) config = JSON.stringify(sel.options.map((o) => o.name));
              } else if (prop.type === "multi_select" && prop.multi_select) {
                const ms = prop.multi_select as { options?: Array<{ name: string; color?: string }> };
                if (ms.options) config = JSON.stringify(ms.options.map((o) => o.name));
              } else if (prop.type === "relation" && prop.relation) {
                config = JSON.stringify(prop.relation);
              } else if (prop.type === "formula" && prop.formula) {
                config = JSON.stringify(prop.formula);
              }
              dbProperties.push({
                database_id: db.id as string,
                name,
                type: prop.type as string,
                config,
              });
            }
          }
        } catch {
          // Skip inaccessible databases
        }
      }
      write(`\u2713 ${dbProperties.length} properties across ${allDatabases.length} databases\n`);

      // Fetch first-paragraph summaries for pages (batched, with rate limit awareness)
      write("  Fetching page summaries... ");
      const pageSummaries = new Map<string, string>();
      let summaryCount = 0;
      for (const page of allPages) {
        try {
          const blocks = await client.blocks.children.list({
            block_id: page.id as string,
            page_size: 3,
          });
          const textParts: string[] = [];
          for (const block of blocks.results) {
            const b = block as unknown as Record<string, unknown>;
            const bType = b.type as string;
            const content = b[bType] as { rich_text?: Array<{ plain_text: string }> } | undefined;
            if (content?.rich_text) {
              textParts.push(content.rich_text.map((t) => t.plain_text).join(""));
            }
            if (textParts.join(" ").length >= 200) break;
          }
          const summary = textParts.join(" ").slice(0, 200).trim();
          if (summary) {
            pageSummaries.set(page.id as string, summary);
            summaryCount++;
          }
        } catch {
          // Skip inaccessible pages
        }
      }
      write(`\u2713 ${summaryCount} summaries\n`);

      // Create output directory
      const outDir = join(process.cwd(), opts.output);
      const pagesDir = join(outDir, "pages");
      const dbsDir = join(outDir, "databases");

      if (existsSync(outDir)) {
        rmSync(outDir, { recursive: true });
      }
      mkdirSync(pagesDir, { recursive: true });
      mkdirSync(dbsDir, { recursive: true });

      // Generate index.md
      write("  Generating index... ");
      const indexLines: string[] = [
        "# Notion Workspace Index",
        "",
        `Generated: ${new Date().toISOString()}`,
        "",
        `**${allPages.length} pages** | **${allDatabases.length} databases**`,
        "",
      ];

      if (allDatabases.length > 0) {
        indexLines.push("## Databases", "", "| Database | Properties | Icon |", "|----------|-----------|------|");
        for (const db of allDatabases) {
          const title = (db.title as Array<{ plain_text: string }>)?.map((t) => t.plain_text).join("") || "(untitled)";
          const icon = getIcon(db) || "";
          const props = db.properties as Record<string, unknown> || {};
          const propCount = Object.keys(props).length;
          indexLines.push(`| [${title}](databases/${db.id}.md) | ${propCount} | ${icon} |`);
        }
        indexLines.push("");
      }

      if (allPages.length > 0) {
        indexLines.push("## Pages", "", "| Page | Icon | Last Edited |", "|------|------|-------------|");
        for (const page of allPages.slice(0, 100)) {
          const title = extractTitle(page);
          const icon = getIcon(page) || "";
          const edited = (page.last_edited_time as string)?.slice(0, 10) || "";
          indexLines.push(`| ${title} | ${icon} | ${edited} |`);
        }
        if (allPages.length > 100) indexLines.push(`| ... and ${allPages.length - 100} more | | |`);
        indexLines.push("");
      }

      writeFileSync(join(outDir, "index.md"), indexLines.join("\n"));
      write("\u2713\n");

      // Generate per-database files
      write(`  Generating ${allDatabases.length} database files... `);
      for (const db of allDatabases) {
        const title = (db.title as Array<{ plain_text: string }>)?.map((t) => t.plain_text).join("") || "(untitled)";
        // Use fetched schema if available, fall back to search result properties
        const schemaData = dbSchemas.get(db.id as string);
        const props = (schemaData?.properties || db.properties) as Record<string, Record<string, unknown>> || {};
        const lines = [
          `# ${title}`,
          "",
          `ID: \`${db.id}\``,
          `URL: ${db.url}`,
          `Properties: ${Object.keys(props).length}`,
          "",
          "| Property | Type | Details |",
          "|----------|------|---------|",
        ];
        for (const [name, prop] of Object.entries(props)) {
          let details = "";
          if (prop.type === "select" && prop.select) {
            const sel = prop.select as { options?: Array<{ name: string }> };
            if (sel.options?.length) details = sel.options.map((o) => o.name).join(", ");
          } else if (prop.type === "multi_select" && prop.multi_select) {
            const ms = prop.multi_select as { options?: Array<{ name: string }> };
            if (ms.options?.length) details = ms.options.map((o) => o.name).join(", ");
          } else if (prop.type === "relation" && prop.relation) {
            const rel = prop.relation as { database_id?: string };
            if (rel.database_id) details = `\u2192 ${rel.database_id.slice(0, 8)}...`;
          }
          lines.push(`| ${name} | ${prop.type} | ${details} |`);
        }
        writeFileSync(join(dbsDir, `${db.id}.md`), lines.join("\n"));
      }
      write("\u2713\n");

      // Write SQLite database
      write("  Writing SQLite database... ");
      try {
        const sqlDb = openDb(outDir);
        clearData(sqlDb);

        const pageRows: PageRow[] = allPages.map((p) => {
          const parent = p.parent as { type: string; page_id?: string; database_id?: string; data_source_id?: string; block_id?: string } || { type: "unknown" };
          return {
            id: p.id as string,
            title: extractTitle(p),
            type: p.object as string,
            parent_type: parent.type,
            parent_id: parent.page_id || parent.database_id || parent.data_source_id || parent.block_id || "workspace",
            url: p.url as string,
            icon: getIcon(p),
            last_edited: p.last_edited_time as string,
            created: p.created_time as string,
            summary: pageSummaries.get(p.id as string) || null,
          };
        });

        const dbRows: DatabaseRow[] = allDatabases.map((d) => {
          const parent = d.parent as { type: string; page_id?: string; database_id?: string; data_source_id?: string; block_id?: string } || { type: "unknown" };
          const schemaData = dbSchemas.get(d.id as string);
          return {
            id: d.id as string,
            title: (d.title as Array<{ plain_text: string }>)?.map((t) => t.plain_text).join("") || "(untitled)",
            parent_type: parent.type,
            parent_id: parent.page_id || parent.database_id || parent.data_source_id || parent.block_id || "workspace",
            url: d.url as string,
            icon: getIcon(d),
            last_edited: d.last_edited_time as string,
            row_count: 0,
            schema_json: schemaData ? JSON.stringify(schemaData.properties) : null,
          };
        });

        insertPages(sqlDb, pageRows);
        insertDatabases(sqlDb, dbRows, dbProperties);

        setMetadata(sqlDb, "snapshot_at", new Date().toISOString());
        setMetadata(sqlDb, "page_count", String(allPages.length));
        setMetadata(sqlDb, "database_count", String(allDatabases.length));

        sqlDb.close();
        write("\u2713\n");
      } catch (e) {
        write(`FAILED (${(e as Error).message})\n`);
      }

      write(`\n  Workspace snapshot saved to ${opts.output}/\n`);
      write(`  ${allPages.length} pages, ${allDatabases.length} databases, ${dbProperties.length} properties\n\n`);
    });
}
