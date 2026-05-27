import { RegularItem } from "./types";
import { getDb } from "./db";

export function getRegularItems(): RegularItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM regular_items ORDER BY category, name").all() as Array<{
    id: string;
    category: string;
    name: string;
    selected: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    selected: row.selected === 1,
  }));
}

export function setRegularItems(items: RegularItem[]): void {
  const db = getDb();
  const insertMany = db.transaction((items: RegularItem[]) => {
    db.prepare("DELETE FROM regular_items").run();
    const stmt = db.prepare(
      "INSERT INTO regular_items (id, category, name, selected) VALUES (?, ?, ?, ?)"
    );
    for (const item of items) {
      stmt.run(item.id, item.category, item.name, item.selected ? 1 : 0);
    }
  });
  insertMany(items);
}

export function addRegularItems(items: RegularItem[]): RegularItem[] {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO regular_items (id, category, name, selected) VALUES (?, ?, ?, ?)"
  );
  const insertMany = db.transaction((items: RegularItem[]) => {
    for (const item of items) {
      stmt.run(item.id, item.category, item.name, item.selected ? 1 : 0);
    }
  });
  insertMany(items);
  return getRegularItems();
}

export function toggleRegularItem(id: string): RegularItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM regular_items WHERE id = ?").get(id) as {
    id: string;
    category: string;
    name: string;
    selected: number;
  } | undefined;

  if (!row) return null;

  const newSelected = row.selected === 1 ? 0 : 1;
  db.prepare("UPDATE regular_items SET selected = ? WHERE id = ?").run(newSelected, id);

  return {
    id: row.id,
    category: row.category,
    name: row.name,
    selected: newSelected === 1,
  };
}

export function clearRegularItems(): void {
  const db = getDb();
  db.prepare("DELETE FROM regular_items").run();
}

export function getSelectedItems(): RegularItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM regular_items WHERE selected = 1 ORDER BY category, name").all() as Array<{
    id: string;
    category: string;
    name: string;
    selected: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    selected: true,
  }));
}

export function deselectAll(): void {
  const db = getDb();
  db.prepare("UPDATE regular_items SET selected = 0").run();
}
