import Database from "better-sqlite3";
import { join } from "node:path";
import { existsSync } from "node:fs";

const DB_FILENAME = "workspace.db";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT,
  type TEXT,
  parent_type TEXT,
  parent_id TEXT,
  url TEXT,
  icon TEXT,
  last_edited TEXT,
  created TEXT,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS databases (
  id TEXT PRIMARY KEY,
  title TEXT,
  parent_type TEXT,
  parent_id TEXT,
  url TEXT,
  icon TEXT,
  last_edited TEXT,
  row_count INTEGER,
  schema_json TEXT
);

CREATE TABLE IF NOT EXISTS db_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT
);

CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS workspace_fts USING fts5(
  name,
  type,
  parent,
  detail,
  tokenize='porter unicode61'
);

CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
CREATE INDEX IF NOT EXISTS idx_db_props_db ON db_properties(database_id);
`;

export function openDb(cacheDir: string): Database.Database {
  const dbPath = join(cacheDir, DB_FILENAME);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);
  return db;
}

export function hasDb(cacheDir: string): boolean {
  return existsSync(join(cacheDir, DB_FILENAME));
}

export function clearData(db: Database.Database): void {
  db.exec("DELETE FROM workspace_fts");
  db.exec("DELETE FROM db_properties");
  db.exec("DELETE FROM databases");
  db.exec("DELETE FROM pages");
  db.exec("DELETE FROM metadata");
}

export function setMetadata(db: Database.Database, key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)").run(key, value);
}

export function getMetadata(db: Database.Database, key: string): string | undefined {
  const row = db.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export interface PageRow {
  id: string;
  title: string;
  type: string;
  parent_type: string;
  parent_id: string;
  url: string;
  icon: string | null;
  last_edited: string;
  created: string;
  summary: string | null;
}

export interface DatabaseRow {
  id: string;
  title: string;
  parent_type: string;
  parent_id: string;
  url: string;
  icon: string | null;
  last_edited: string;
  row_count: number;
  schema_json: string | null;
}

export interface DbPropertyRow {
  database_id: string;
  name: string;
  type: string;
  config: string | null;
}

export function insertPages(db: Database.Database, pages: PageRow[]): void {
  const insert = db.prepare(
    "INSERT OR REPLACE INTO pages (id, title, type, parent_type, parent_id, url, icon, last_edited, created, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertFts = db.prepare(
    "INSERT INTO workspace_fts (name, type, parent, detail) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const p of pages) {
      insert.run(p.id, p.title, p.type, p.parent_type, p.parent_id, p.url, p.icon, p.last_edited, p.created, p.summary);
      const detail = [p.type, p.icon || "", p.summary || ""].filter(Boolean).join(" ");
      insertFts.run(p.title, "page", p.parent_id, detail);
    }
  });
  tx();
}

export function insertDatabases(db: Database.Database, databases: DatabaseRow[], properties: DbPropertyRow[]): void {
  const insertDb = db.prepare(
    "INSERT OR REPLACE INTO databases (id, title, parent_type, parent_id, url, icon, last_edited, row_count, schema_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertProp = db.prepare(
    "INSERT INTO db_properties (database_id, name, type, config) VALUES (?, ?, ?, ?)"
  );
  const insertFts = db.prepare(
    "INSERT INTO workspace_fts (name, type, parent, detail) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const d of databases) {
      insertDb.run(d.id, d.title, d.parent_type, d.parent_id, d.url, d.icon, d.last_edited, d.row_count, d.schema_json);
      insertFts.run(d.title, "database", d.parent_id, `${d.row_count} rows ${d.icon || ""}`);
    }
    for (const p of properties) {
      insertProp.run(p.database_id, p.name, p.type, p.config);
      insertFts.run(p.name, "property", p.database_id, p.type);
    }
  });
  tx();
}

// Query helpers

export interface FtsResult {
  name: string;
  type: string;
  parent: string;
  detail: string;
  rank: number;
}

export function searchWorkspace(db: Database.Database, query: string): FtsResult[] {
  const safeQuery = query.replace(/['"():^*{}[\]]/g, "").replace(/[+\-~<>]/g, " ").trim();
  if (!safeQuery) return [];

  try {
    return db.prepare(`
      SELECT name, type, parent, detail, rank
      FROM workspace_fts
      WHERE workspace_fts MATCH ?
      ORDER BY rank
      LIMIT 50
    `).all(`"${safeQuery}"*`) as FtsResult[];
  } catch {
    return db.prepare(`
      SELECT name, type, parent, detail, 0 as rank
      FROM workspace_fts
      WHERE name LIKE ? OR detail LIKE ?
      ORDER BY type, name
      LIMIT 50
    `).all(`%${safeQuery}%`, `%${safeQuery}%`) as FtsResult[];
  }
}

export function getAllPages(db: Database.Database): PageRow[] {
  return db.prepare("SELECT * FROM pages ORDER BY title").all() as PageRow[];
}

export function getAllDatabases(db: Database.Database): DatabaseRow[] {
  return db.prepare("SELECT * FROM databases ORDER BY title").all() as DatabaseRow[];
}

export function getDbProperties(db: Database.Database, databaseId: string): DbPropertyRow[] {
  return db.prepare("SELECT * FROM db_properties WHERE database_id = ? ORDER BY name").all(databaseId) as DbPropertyRow[];
}

export function getPage(db: Database.Database, id: string): PageRow | undefined {
  return db.prepare("SELECT * FROM pages WHERE id = ?").get(id) as PageRow | undefined;
}

export function getDatabase(db: Database.Database, id: string): DatabaseRow | undefined {
  return db.prepare("SELECT * FROM databases WHERE id = ?").get(id) as DatabaseRow | undefined;
}

export function findDatabaseByQuery(db: Database.Database, query: string): DatabaseRow | undefined {
  // Try exact ID first
  const exact = getDatabase(db, query);
  if (exact) return exact;
  // Try partial ID or title match
  const allDbs = getAllDatabases(db);
  return allDbs.find((d) =>
    d.id.includes(query) || d.title.toLowerCase().includes(query.toLowerCase())
  );
}

export interface TreeNode {
  id: string;
  title: string;
  icon: string | null;
  type: "page" | "database";
  children: TreeNode[];
}

export function buildTree(db: Database.Database): TreeNode[] {
  const pages = getAllPages(db);
  const databases = getAllDatabases(db);

  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes for all pages and databases
  for (const p of pages) {
    nodeMap.set(p.id, { id: p.id, title: p.title, icon: p.icon, type: "page", children: [] });
  }
  for (const d of databases) {
    nodeMap.set(d.id, { id: d.id, title: d.title, icon: d.icon, type: "database", children: [] });
  }

  // Build parent-child relationships
  for (const p of pages) {
    const node = nodeMap.get(p.id)!;
    const parent = nodeMap.get(p.parent_id);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const d of databases) {
    const node = nodeMap.get(d.id)!;
    const parent = nodeMap.get(d.parent_id);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function getBreadcrumb(db: Database.Database, itemId: string): string {
  const pages = new Map<string, PageRow>();
  const databases = new Map<string, DatabaseRow>();
  for (const p of getAllPages(db)) pages.set(p.id, p);
  for (const d of getAllDatabases(db)) databases.set(d.id, d);

  const parts: string[] = [];
  let currentId = itemId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const page = pages.get(currentId);
    const database = databases.get(currentId);
    if (page) {
      parts.unshift(`${page.icon || "\u{1F4CB}"} ${page.title}`);
      currentId = page.parent_id;
    } else if (database) {
      parts.unshift(`${database.icon || "\u{1F4CA}"} ${database.title}`);
      currentId = database.parent_id;
    } else {
      break;
    }
  }

  return parts.join(" \u2192 ");
}
