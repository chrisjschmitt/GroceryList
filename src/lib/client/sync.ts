import { GroceryItem, RegularItem } from "../types";
import {
  localGetGroceryItems,
  localSetGroceryItems,
  localGetRegularItems,
  localSetRegularItems,
  setLastSyncTime,
} from "./local-db";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";
export type DirtyFlag = "grocery" | "regular";

export async function pushDirtyToServer(dirty: Set<DirtyFlag>): Promise<{ success: boolean }> {
  if (!navigator.onLine || dirty.size === 0) {
    return { success: dirty.size === 0 };
  }

  try {
    const payload: Record<string, unknown> = {};

    if (dirty.has("grocery")) {
      payload.groceryItems = await localGetGroceryItems();
    }
    if (dirty.has("regular")) {
      payload.regularItems = await localGetRegularItems();
    }

    const res = await fetch("/api/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return { success: false };

    await setLastSyncTime(Date.now());
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function syncAllToServer(): Promise<{ success: boolean }> {
  return pushDirtyToServer(new Set(["grocery", "regular"]));
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
