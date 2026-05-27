"use client";

import { useState, useEffect, useCallback } from "react";
import { GroceryItem, RegularItem, StorePrice } from "../types";
import {
  localGetGroceryItems,
  localAddGroceryItem,
  localUpdateGroceryItem,
  localRemoveGroceryItem,
  localClearCheckedGroceryItems,
  localClearAllGroceryItems,
  localGetRegularItems,
  localSetRegularItems,
  localUpdateRegularItem,
  localClearRegularItems,
} from "./local-db";
import { pullFromServer, syncToServer, SyncStatus } from "./sync";
import { parseCsv } from "../csv-parser";

export interface OfflineStore {
  groceryItems: GroceryItem[];
  regularItems: RegularItem[];
  syncStatus: SyncStatus;
  isOnline: boolean;
  addGroceryItem: (name: string, quantity: number, unit: string) => Promise<void>;
  toggleGroceryItem: (id: string) => Promise<void>;
  removeGroceryItem: (id: string) => Promise<void>;
  removeGroceryItemByName: (name: string) => Promise<void>;
  clearCheckedGroceryItems: () => Promise<void>;
  clearAllGroceryItems: () => Promise<void>;
  toggleRegularItem: (id: string) => Promise<void>;
  uploadCsv: (file: File) => Promise<{ count: number; errors: string[] }>;
  clearRegularItems: () => Promise<void>;
  addSelectedToGroceryList: (items: RegularItem[]) => Promise<void>;
}

export function useOfflineStore(): OfflineStore {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [regularItems, setRegularItems] = useState<RegularItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [isOnline, setIsOnline] = useState(true);

  // Push current IndexedDB state to server. Fire-and-forget on failure.
  const pushToServer = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    const result = await syncToServer();
    setSyncStatus(result.success ? "synced" : "offline");
  }, []);

  // Load from IndexedDB on mount, then reconcile with server
  useEffect(() => {
    async function init() {
      const [localGrocery, localRegular] = await Promise.all([
        localGetGroceryItems(),
        localGetRegularItems(),
      ]);

      setGroceryItems(localGrocery);
      setRegularItems(localRegular);

      if (!navigator.onLine) {
        setSyncStatus("offline");
        setIsOnline(false);
        return;
      }

      const serverData = await pullFromServer();

      if (!serverData) {
        // Server unreachable — keep local data
        return;
      }

      const serverHasData =
        serverData.groceryItems.length > 0 || serverData.regularItems.length > 0;
      const localHasData = localGrocery.length > 0 || localRegular.length > 0;

      if (serverHasData) {
        // Server has data — use it as source of truth
        setGroceryItems(serverData.groceryItems);
        setRegularItems(serverData.regularItems);
        setSyncStatus("synced");
      } else if (localHasData) {
        // Server empty, local has data — push local to server
        const result = await syncToServer();
        setSyncStatus(result.success ? "synced" : "offline");
      } else {
        setSyncStatus("synced");
      }
    }

    init();
  }, []);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      pushToServer();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pushToServer]);

  const addGroceryItem = useCallback(async (name: string, quantity: number, unit: string) => {
    const existing = await localGetGroceryItems();
    if (existing.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    const prices: StorePrice[] = [];
    const bestPrice: StorePrice | undefined = undefined;

    const newItem: GroceryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      quantity,
      unit,
      checked: false,
      prices,
      bestPrice,
      createdAt: new Date().toISOString(),
    };

    // Try to get prices from server
    if (navigator.onLine) {
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, quantity, unit }),
        });
        if (res.ok) {
          const data = await res.json();
          Object.assign(newItem, data.item);
        }
      } catch {
        // use item without prices
      }
    }

    await localAddGroceryItem(newItem);
    setGroceryItems((prev) => [...prev, newItem]);
    await pushToServer();
  }, [pushToServer]);

  const toggleGroceryItem = useCallback(async (id: string) => {
    setGroceryItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );

    const items = await localGetGroceryItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      await localUpdateGroceryItem({ ...item, checked: !item.checked });
    }

    await pushToServer();
  }, [pushToServer]);

  const removeGroceryItem = useCallback(async (id: string) => {
    setGroceryItems((prev) => prev.filter((i) => i.id !== id));
    await localRemoveGroceryItem(id);
    await pushToServer();
  }, [pushToServer]);

  const removeGroceryItemByName = useCallback(async (name: string) => {
    const items = await localGetGroceryItems();
    const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (item) {
      setGroceryItems((prev) => prev.filter((i) => i.id !== item.id));
      await localRemoveGroceryItem(item.id);
      await pushToServer();
    }
  }, [pushToServer]);

  const clearCheckedGroceryItems = useCallback(async () => {
    setGroceryItems((prev) => prev.filter((i) => !i.checked));
    await localClearCheckedGroceryItems();
    await pushToServer();
  }, [pushToServer]);

  const clearAllGroceryItems = useCallback(async () => {
    setGroceryItems([]);
    await localClearAllGroceryItems();
    await pushToServer();
  }, [pushToServer]);

  const toggleRegularItem = useCallback(async (id: string) => {
    setRegularItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );

    const items = await localGetRegularItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      await localUpdateRegularItem({ ...item, selected: !item.selected });
    }

    await pushToServer();
  }, [pushToServer]);

  const uploadCsv = useCallback(async (file: File): Promise<{ count: number; errors: string[] }> => {
    const content = await file.text();
    const { items, errors } = parseCsv(content);

    if (items.length === 0) {
      return { count: 0, errors: errors.length > 0 ? errors : ["No valid items found"] };
    }

    await localSetRegularItems(items);
    setRegularItems(items);

    // Immediately push to server so data is available on other devices
    await pushToServer();

    return { count: items.length, errors };
  }, [pushToServer]);

  const clearRegularItems = useCallback(async () => {
    setRegularItems([]);
    await localClearRegularItems();
    await pushToServer();
  }, [pushToServer]);

  const addSelectedToGroceryList = useCallback(async (selected: RegularItem[]) => {
    const currentItems = await localGetGroceryItems();
    const currentNames = new Set(currentItems.map((i) => i.name.toLowerCase()));
    const newItems = selected.filter((i) => !currentNames.has(i.name.toLowerCase()));

    for (const ri of newItems) {
      await addGroceryItem(ri.name, 1, "unit");
    }

    const allRegular = await localGetRegularItems();
    for (const item of allRegular) {
      if (item.selected) {
        await localUpdateRegularItem({ ...item, selected: false });
      }
    }
    setRegularItems((prev) => prev.map((i) => ({ ...i, selected: false })));
    await pushToServer();
  }, [addGroceryItem, pushToServer]);

  return {
    groceryItems,
    regularItems,
    syncStatus,
    isOnline,
    addGroceryItem,
    toggleGroceryItem,
    removeGroceryItem,
    removeGroceryItemByName,
    clearCheckedGroceryItems,
    clearAllGroceryItems,
    toggleRegularItem,
    uploadCsv,
    clearRegularItems,
    addSelectedToGroceryList,
  };
}
