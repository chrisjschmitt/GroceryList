import { GroceryItem, RegularItem } from "../types";
import {
  localGetGroceryItems,
  localSetGroceryItems,
  localGetRegularItems,
  localSetRegularItems,
  setLastSyncTime,
} from "./local-db";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export async function syncToServer(): Promise<{ success: boolean }> {
  if (!navigator.onLine) {
    return { success: false };
  }

  try {
    const [localGroceryItems, localRegularItems] = await Promise.all([
      localGetGroceryItems(),
      localGetRegularItems(),
    ]);

    if (localGroceryItems.length === 0 && localRegularItems.length === 0) {
      return { success: true };
    }

    const res = await fetch("/api/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groceryItems: localGroceryItems,
        regularItems: localRegularItems,
      }),
    });

    if (!res.ok) return { success: false };

    await setLastSyncTime(Date.now());
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function pullFromServer(): Promise<{
  groceryItems: GroceryItem[];
  regularItems: RegularItem[];
} | null> {
  if (!navigator.onLine) return null;

  try {
    const res = await fetch("/api/sync");
    if (!res.ok) return null;

    const data = await res.json();
    const groceryItems: GroceryItem[] = data.groceryItems || [];
    const regularItems: RegularItem[] = data.regularItems || [];

    await localSetGroceryItems(groceryItems);
    await localSetRegularItems(regularItems);
    await setLastSyncTime(Date.now());

    return { groceryItems, regularItems };
  } catch {
    return null;
  }
}
