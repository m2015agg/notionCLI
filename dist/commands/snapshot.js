import { Command } from "commander";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { getClient } from "../client.js";
import { openDb, clearData, setMetadata, insertPages, insertDatabases, } from "../util/workspace-db.js";
function write(msg) {
    process.stdout.write(msg);
}
function extractTitle(page) {
    const properties = page.properties;
    if (!properties)
        return "(untitled)";
    for (const prop of Object.values(properties)) {
        if (prop.type === "title" && prop.title) {
            return prop.title.map((t) => t.plain_text).join("") || "(untitled)";
        }
    }
    return "(untitled)";
}
function getIcon(item) {
    const icon = item.icon;
    if (icon?.type === "emoji")
        return icon.emoji || null;
    return null;
}
export function snapshotCommand() {
    return new Command("snapshot")
        .description("Snapshot Notion workspace structure to local .notion-cache/ for fast lookups")
        .option("--output <dir>", "Output directory", ".notion-cache")
        .action(async (opts) => {
        write("\n  Snapshotting Notion workspace...\n");
        const client = getClient();
        // Paginate through all shared pages
        write("  Fetching pages... ");
        const allPages = [];
        const seenPageIds = new Set();
        let hasMore = true;
        let startCursor;
        while (hasMore) {
            const response = await client.search({
                start_cursor: startCursor,
                page_size: 100,
                filter: { property: "object", value: "page" },
            });
            for (const item of response.results) {
                const obj = item;
                if (!seenPageIds.has(obj.id)) {
                    seenPageIds.add(obj.id);
                    allPages.push(obj);
                }
            }
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }
        write(`\u2713 ${allPages.length} pages\n`);
        // Fetch databases separately (search API with filter)
        write("  Fetching databases... ");
        const allDatabases = [];
        const seenDbIds = new Set();
        hasMore = true;
        startCursor = undefined;
        while (hasMore) {
            const response = await client.search({
                start_cursor: startCursor,
                page_size: 100,
                filter: { property: "object", value: "data_source" },
            });
            for (const item of response.results) {
                const obj = item;
                if (!seenDbIds.has(obj.id)) {
                    seenDbIds.add(obj.id);
                    allDatabases.push(obj);
                }
            }
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }
        write(`\u2713 ${allDatabases.length} databases\n`);
        if (allDatabases.length === 0) {
            write("  (No databases found — ensure databases are shared with the integration)\n");
        }
        // Fetch database schemas
        write("  Fetching database schemas... ");
        const dbProperties = [];
        const dbSchemas = new Map();
        for (const db of allDatabases) {
            try {
                const schema = await client.databases.retrieve({ database_id: db.id });
                const schemaObj = schema;
                dbSchemas.set(db.id, schemaObj);
                const props = schemaObj.properties;
                if (props) {
                    for (const [name, prop] of Object.entries(props)) {
                        // Extract config for select/multi_select options
                        let config = null;
                        if (prop.type === "select" && prop.select) {
                            const sel = prop.select;
                            if (sel.options)
                                config = JSON.stringify(sel.options.map((o) => o.name));
                        }
                        else if (prop.type === "multi_select" && prop.multi_select) {
                            const ms = prop.multi_select;
                            if (ms.options)
                                config = JSON.stringify(ms.options.map((o) => o.name));
                        }
                        else if (prop.type === "relation" && prop.relation) {
                            config = JSON.stringify(prop.relation);
                        }
                        else if (prop.type === "formula" && prop.formula) {
                            config = JSON.stringify(prop.formula);
                        }
                        dbProperties.push({
                            database_id: db.id,
                            name,
                            type: prop.type,
                            config,
                        });
                    }
                }
            }
            catch {
                // Skip inaccessible databases
            }
        }
        write(`\u2713 ${dbProperties.length} properties across ${allDatabases.length} databases\n`);
        // Fetch first-paragraph summaries for pages (batched, with rate limit awareness)
        write("  Fetching page summaries... ");
        const pageSummaries = new Map();
        let summaryCount = 0;
        for (const page of allPages) {
            try {
                const blocks = await client.blocks.children.list({
                    block_id: page.id,
                    page_size: 3,
                });
                const textParts = [];
                for (const block of blocks.results) {
                    const b = block;
                    const bType = b.type;
                    const content = b[bType];
                    if (content?.rich_text) {
                        textParts.push(content.rich_text.map((t) => t.plain_text).join(""));
                    }
                    if (textParts.join(" ").length >= 200)
                        break;
                }
                const summary = textParts.join(" ").slice(0, 200).trim();
                if (summary) {
                    pageSummaries.set(page.id, summary);
                    summaryCount++;
                }
            }
            catch {
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
        const indexLines = [
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
                const title = db.title?.map((t) => t.plain_text).join("") || "(untitled)";
                const icon = getIcon(db) || "";
                const props = db.properties || {};
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
                const edited = page.last_edited_time?.slice(0, 10) || "";
                indexLines.push(`| ${title} | ${icon} | ${edited} |`);
            }
            if (allPages.length > 100)
                indexLines.push(`| ... and ${allPages.length - 100} more | | |`);
            indexLines.push("");
        }
        writeFileSync(join(outDir, "index.md"), indexLines.join("\n"));
        write("\u2713\n");
        // Generate per-database files
        write(`  Generating ${allDatabases.length} database files... `);
        for (const db of allDatabases) {
            const title = db.title?.map((t) => t.plain_text).join("") || "(untitled)";
            // Use fetched schema if available, fall back to search result properties
            const schemaData = dbSchemas.get(db.id);
            const props = (schemaData?.properties || db.properties) || {};
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
                    const sel = prop.select;
                    if (sel.options?.length)
                        details = sel.options.map((o) => o.name).join(", ");
                }
                else if (prop.type === "multi_select" && prop.multi_select) {
                    const ms = prop.multi_select;
                    if (ms.options?.length)
                        details = ms.options.map((o) => o.name).join(", ");
                }
                else if (prop.type === "relation" && prop.relation) {
                    const rel = prop.relation;
                    if (rel.database_id)
                        details = `\u2192 ${rel.database_id.slice(0, 8)}...`;
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
            const pageRows = allPages.map((p) => {
                const parent = p.parent || { type: "unknown" };
                return {
                    id: p.id,
                    title: extractTitle(p),
                    type: p.object,
                    parent_type: parent.type,
                    parent_id: parent.page_id || parent.database_id || "workspace",
                    url: p.url,
                    icon: getIcon(p),
                    last_edited: p.last_edited_time,
                    created: p.created_time,
                    summary: pageSummaries.get(p.id) || null,
                };
            });
            const dbRows = allDatabases.map((d) => {
                const parent = d.parent || { type: "unknown" };
                const schemaData = dbSchemas.get(d.id);
                return {
                    id: d.id,
                    title: d.title?.map((t) => t.plain_text).join("") || "(untitled)",
                    parent_type: parent.type,
                    parent_id: parent.page_id || parent.database_id || "workspace",
                    url: d.url,
                    icon: getIcon(d),
                    last_edited: d.last_edited_time,
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
        }
        catch (e) {
            write(`FAILED (${e.message})\n`);
        }
        write(`\n  Workspace snapshot saved to ${opts.output}/\n`);
        write(`  ${allPages.length} pages, ${allDatabases.length} databases, ${dbProperties.length} properties\n\n`);
    });
}
//# sourceMappingURL=snapshot.js.map