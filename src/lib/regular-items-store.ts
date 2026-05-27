import { RegularItem } from "./types";

let regularItems: RegularItem[] = [];

export function getRegularItems(): RegularItem[] {
  return [...regularItems];
}

export function setRegularItems(items: RegularItem[]): void {
  regularItems = [...items];
}

export function addRegularItems(items: RegularItem[]): RegularItem[] {
  regularItems.push(...items);
  return [...regularItems];
}

export function toggleRegularItem(id: string): RegularItem | null {
  const item = regularItems.find((i) => i.id === id);
  if (!item) return null;
  item.selected = !item.selected;
  return { ...item };
}

export function clearRegularItems(): void {
  regularItems = [];
}

export function getSelectedItems(): RegularItem[] {
  return regularItems.filter((i) => i.selected);
}

export function deselectAll(): void {
  regularItems.forEach((i) => { i.selected = false; });
}
