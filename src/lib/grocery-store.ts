import { GroceryItem, StorePrice } from "./types";
import { lookupPrices, findBestPrice } from "./store-data";
import { getDb } from "./db";

export function getItems(): GroceryItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM grocery_items ORDER BY created_at DESC").all() as Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    checked: number;
    prices: string;
    best_price: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    checked: row.checked === 1,
    prices: JSON.parse(row.prices) as StorePrice[],
    bestPrice: row.best_price ? (JSON.parse(row.best_price) as StorePrice) : undefined,
    createdAt: row.created_at,
  }));
}

export function addItem(name: string, quantity: number, unit: string): GroceryItem {
  const db = getDb();
  const prices = lookupPrices(name);
  const bestPrice = findBestPrice(prices);

  const item: GroceryItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    quantity,
    unit,
    checked: false,
    prices,
    bestPrice,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO grocery_items (id, name, quantity, unit, checked, prices, best_price, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.name,
    item.quantity,
    item.unit,
    0,
    JSON.stringify(item.prices),
    item.bestPrice ? JSON.stringify(item.bestPrice) : null,
    item.createdAt
  );

  return item;
}

export function toggleItem(id: string): GroceryItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM grocery_items WHERE id = ?").get(id) as {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    checked: number;
    prices: string;
    best_price: string | null;
    created_at: string;
  } | undefined;

  if (!row) return null;

  const newChecked = row.checked === 1 ? 0 : 1;
  db.prepare("UPDATE grocery_items SET checked = ? WHERE id = ?").run(newChecked, id);

  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    checked: newChecked === 1,
    prices: JSON.parse(row.prices) as StorePrice[],
    bestPrice: row.best_price ? (JSON.parse(row.best_price) as StorePrice) : undefined,
    createdAt: row.created_at,
  };
}

export function removeItem(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM grocery_items WHERE id = ?").run(id);
  return result.changes > 0;
}

export function clearChecked(): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM grocery_items WHERE checked = 1").run();
  return result.changes;
}
