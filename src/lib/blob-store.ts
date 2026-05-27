import { put, get } from "@vercel/blob";
import { GroceryItem, RegularItem } from "./types";

const GROCERY_BLOB = "grocerylist/grocery-items.json";
const REGULAR_BLOB = "grocerylist/regular-items.json";

async function readBlob<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const response = await get(pathname, {
      access: "private",
      
    });
    if (!response || response.statusCode !== 200) return fallback;
    const text = await new Response(response.stream).text();
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeBlob<T>(pathname: string, data: T): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function blobGetGroceryItems(): Promise<GroceryItem[]> {
  return readBlob<GroceryItem[]>(GROCERY_BLOB, []);
}

export async function blobSetGroceryItems(items: GroceryItem[]): Promise<void> {
  await writeBlob(GROCERY_BLOB, items);
}

export async function blobGetRegularItems(): Promise<RegularItem[]> {
  return readBlob<RegularItem[]>(REGULAR_BLOB, []);
}

export async function blobSetRegularItems(items: RegularItem[]): Promise<void> {
  await writeBlob(REGULAR_BLOB, items);
}
