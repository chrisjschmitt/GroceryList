import { put, head, del } from "@vercel/blob";
import { GroceryItem, RegularItem } from "./types";

const GROCERY_BLOB = "grocerylist/grocery-items.json";
const REGULAR_BLOB = "grocerylist/regular-items.json";

async function readBlob<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const metadata = await head(pathname);
    const res = await fetch(metadata.url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function writeBlob<T>(pathname: string, data: T): Promise<void> {
  try {
    await del(pathname);
  } catch {
    // blob may not exist yet
  }
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

// Grocery Items
export async function blobGetGroceryItems(): Promise<GroceryItem[]> {
  return readBlob<GroceryItem[]>(GROCERY_BLOB, []);
}

export async function blobSetGroceryItems(items: GroceryItem[]): Promise<void> {
  await writeBlob(GROCERY_BLOB, items);
}

// Regular Items
export async function blobGetRegularItems(): Promise<RegularItem[]> {
  return readBlob<RegularItem[]>(REGULAR_BLOB, []);
}

export async function blobSetRegularItems(items: RegularItem[]): Promise<void> {
  await writeBlob(REGULAR_BLOB, items);
}
