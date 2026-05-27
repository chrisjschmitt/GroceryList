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
    const localGroceryItems = await localGetGroceryItems();
    const localRegularItems = await localGetRegularItems();

    const [serverGroceryRes, serverRegularRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/regular-items"),
    ]);

    if (!serverGroceryRes.ok || !serverRegularRes.ok) {
      return { success: false };
    }

    const serverGrocery = await serverGroceryRes.json();
    const serverRegular = await serverRegularRes.json();

    const serverGroceryItems: GroceryItem[] = serverGrocery.items;
    void serverRegular.items;

    // Sync grocery items: local wins (push local state to server)
    await pushGroceryItems(localGroceryItems, serverGroceryItems);

    // Sync regular items: local wins (push local state to server)
    await pushRegularItems(localRegularItems);

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
    const [groceryRes, regularRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/regular-items"),
    ]);

    if (!groceryRes.ok || !regularRes.ok) return null;

    const groceryData = await groceryRes.json();
    const regularData = await regularRes.json();

    const groceryItems: GroceryItem[] = groceryData.items;
    const regularItems: RegularItem[] = regularData.items;

    await localSetGroceryItems(groceryItems);
    await localSetRegularItems(regularItems);
    await setLastSyncTime(Date.now());

    return { groceryItems, regularItems };
  } catch {
    return null;
  }
}

async function pushGroceryItems(
  localItems: GroceryItem[],
  serverItems: GroceryItem[]
): Promise<void> {
  const serverMap = new Map(serverItems.map((i) => [i.id, i]));
  const localMap = new Map(localItems.map((i) => [i.id, i]));

  // Delete items on server that aren't in local
  for (const serverItem of serverItems) {
    if (!localMap.has(serverItem.id)) {
      await fetch(`/api/items/${serverItem.id}`, { method: "DELETE" });
    }
  }

  // Add/update items from local to server
  for (const localItem of localItems) {
    const serverItem = serverMap.get(localItem.id);
    if (!serverItem) {
      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: localItem.name,
          quantity: localItem.quantity,
          unit: localItem.unit,
          id: localItem.id,
        }),
      });
    } else if (serverItem.checked !== localItem.checked) {
      await fetch(`/api/items/${localItem.id}`, { method: "PATCH" });
    }
  }
}

async function pushRegularItems(
  localItems: RegularItem[]

): Promise<void> {
  if (localItems.length === 0) return;

  // Full replace: clear server and re-upload
  await fetch("/api/regular-items", { method: "DELETE" });

  // Re-upload via a synthetic CSV-like approach using the API
  const csvLines = localItems.map((i) => `${i.category},${i.name}`).join("\n");
  const blob = new Blob([`Category,Item\n${csvLines}`], { type: "text/csv" });
  const file = new File([blob], "sync.csv", { type: "text/csv" });

  const formData = new FormData();
  formData.append("file", file);

  await fetch("/api/regular-items", {
    method: "POST",
    body: formData,
  });
}
