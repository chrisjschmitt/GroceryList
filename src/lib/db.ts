import Database from "better-sqlite3";
import path from "path";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const DB_PATH = isTest ? ":memory:" : path.join(process.cwd(), "grocerylist.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    if (!isTest) {
      db.pragma("journal_mode = WAL");
    }
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'unit',
      checked INTEGER NOT NULL DEFAULT 0,
      prices TEXT NOT NULL DEFAULT '[]',
      best_price TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS regular_items (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      selected INTEGER NOT NULL DEFAULT 0
    );
  `);
}
