import { GroceryItem } from "./types";
import { lookupPrices, findBestPrice } from "./store-data";

let items: GroceryItem[] = [];

export function getItems(): GroceryItem[] {
  return [...items];
}

export function addItem(name: string, quantity: number, unit: string): GroceryItem {
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

  items.push(item);
  return item;
}

export function toggleItem(id: string): GroceryItem | null {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.checked = !item.checked;
  return { ...item };
}

export function removeItem(id: string): boolean {
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
}

export function clearChecked(): number {
  const before = items.length;
  items = items.filter((i) => !i.checked);
  return before - items.length;
}
