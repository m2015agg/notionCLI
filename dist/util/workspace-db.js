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
  created TEXT
);

CREATE TABLE IF NOT EXISTS databases (
  id TEXT PRIMARY KEY,
  title TEXT,
  parent_type TEXT,
  parent_id TEXT,
  url TEXT,
  icon TEXT,
  last_edited TEXT,
  row_count INTEGER
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
export function openDb(cacheDir) {
    const dbPath = join(cacheDir, DB_FILENAME);
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA_SQL);
    return db;
}
export function hasDb(cacheDir) {
    return existsSync(join(cacheDir, DB_FILENAME));
}
export function clearData(db) {
    db.exec("DELETE FROM workspace_fts");
    db.exec("DELETE FROM db_properties");
    db.exec("DELETE FROM databases");
    db.exec("DELETE FROM pages");
    db.exec("DELETE FROM metadata");
}
export function setMetadata(db, key, value) {
    db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)").run(key, value);
}
export function getMetadata(db, key) {
    const row = db.prepare("SELECT value FROM metadata WHERE key = ?").get(key);
    return row?.value;
}
export function insertPages(db, pages) {
    const insert = db.prepare("INSERT OR REPLACE INTO pages (id, title, type, parent_type, parent_id, url, icon, last_edited, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertFts = db.prepare("INSERT INTO workspace_fts (name, type, parent, detail) VALUES (?, ?, ?, ?)");
    const tx = db.transaction(() => {
        for (const p of pages) {
            insert.run(p.id, p.title, p.type, p.parent_type, p.parent_id, p.url, p.icon, p.last_edited, p.created);
            insertFts.run(p.title, "page", p.parent_id, `${p.type} ${p.icon || ""}`);
        }
    });
    tx();
}
export function insertDatabases(db, databases, properties) {
    const insertDb = db.prepare("INSERT OR REPLACE INTO databases (id, title, parent_type, parent_id, url, icon, last_edited, row_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const insertProp = db.prepare("INSERT INTO db_properties (database_id, name, type, config) VALUES (?, ?, ?, ?)");
    const insertFts = db.prepare("INSERT INTO workspace_fts (name, type, parent, detail) VALUES (?, ?, ?, ?)");
    const tx = db.transaction(() => {
        for (const d of databases) {
            insertDb.run(d.id, d.title, d.parent_type, d.parent_id, d.url, d.icon, d.last_edited, d.row_count);
            insertFts.run(d.title, "database", d.parent_id, `${d.row_count} rows ${d.icon || ""}`);
        }
        for (const p of properties) {
            insertProp.run(p.database_id, p.name, p.type, p.config);
            insertFts.run(p.name, "property", p.database_id, p.type);
        }
    });
    tx();
}
export function searchWorkspace(db, query) {
    const safeQuery = query.replace(/['"():^*{}[\]]/g, "").replace(/[+\-~<>]/g, " ").trim();
    if (!safeQuery)
        return [];
    try {
        return db.prepare(`
      SELECT name, type, parent, detail, rank
      FROM workspace_fts
      WHERE workspace_fts MATCH ?
      ORDER BY rank
      LIMIT 50
    `).all(`"${safeQuery}"*`);
    }
    catch {
        return db.prepare(`
      SELECT name, type, parent, detail, 0 as rank
      FROM workspace_fts
      WHERE name LIKE ? OR detail LIKE ?
      ORDER BY type, name
      LIMIT 50
    `).all(`%${safeQuery}%`, `%${safeQuery}%`);
    }
}
export function getAllPages(db) {
    return db.prepare("SELECT * FROM pages ORDER BY title").all();
}
export function getAllDatabases(db) {
    return db.prepare("SELECT * FROM databases ORDER BY title").all();
}
export function getDbProperties(db, databaseId) {
    return db.prepare("SELECT * FROM db_properties WHERE database_id = ? ORDER BY name").all(databaseId);
}
export function getPage(db, id) {
    return db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
}
export function getDatabase(db, id) {
    return db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
}
//# sourceMappingURL=workspace-db.js.map