"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSyncRef = useRef<() => void>(() => {});

  const scheduleSync = useCallback(() => {
    scheduleSyncRef.current();
  }, []);

  useEffect(() => {
    scheduleSyncRef.current = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(async () => {
        if (!navigator.onLine) {
          setSyncStatus("offline");
          return;
        }
        setSyncStatus("syncing");
        const result = await syncToServer();
        setSyncStatus(result.success ? "synced" : "offline");
      }, 1000);
    };
  });

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

      const serverHasGrocery = serverData.groceryItems.length > 0;
      const serverHasRegular = serverData.regularItems.length > 0;
      const localHasGrocery = localGrocery.length > 0;
      const localHasRegular = localRegular.length > 0;

      if (serverHasGrocery || serverHasRegular) {
        // Server has data — use it (server is the cross-device source of truth)
        setGroceryItems(serverData.groceryItems);
        setRegularItems(serverData.regularItems);
        setSyncStatus("synced");
      } else if (localHasGrocery || localHasRegular) {
        // Server is empty but local has data — push local to server
        setSyncStatus("syncing");
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
      scheduleSync();
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
  }, [scheduleSync]);

  const addGroceryItem = useCallback(async (name: string, quantity: number, unit: string) => {
    const existing = await localGetGroceryItems();
    if (existing.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    if (navigator.onLine) {
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, quantity, unit }),
        });
        if (res.ok) {
          const data = await res.json();
          const newItem: GroceryItem = data.item;
          await localAddGroceryItem(newItem);
          setGroceryItems((prev) => [...prev, newItem]);
          setSyncStatus("synced");
          return;
        }
      } catch {
        // fall through to offline creation
      }
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

    await localAddGroceryItem(newItem);
    setGroceryItems((prev) => [...prev, newItem]);
    setSyncStatus("offline");
    scheduleSync();
  }, [scheduleSync]);

  const toggleGroceryItem = useCallback(async (id: string) => {
    setGroceryItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );

    const items = await localGetGroceryItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      const updated = { ...item, checked: !item.checked };
      await localUpdateGroceryItem(updated);
    }

    if (navigator.onLine) {
      try {
        await fetch(`/api/items/${id}`, { method: "PATCH" });
        setSyncStatus("synced");
      } catch {
        setSyncStatus("offline");
        scheduleSync();
      }
    } else {
      setSyncStatus("offline");
    }
  }, [scheduleSync]);

  const removeGroceryItem = useCallback(async (id: string) => {
    setGroceryItems((prev) => prev.filter((i) => i.id !== id));
    await localRemoveGroceryItem(id);

    if (navigator.onLine) {
      try {
        await fetch(`/api/items/${id}`, { method: "DELETE" });
        setSyncStatus("synced");
      } catch {
        scheduleSync();
      }
    } else {
      setSyncStatus("offline");
    }
  }, [scheduleSync]);

  const removeGroceryItemByName = useCallback(async (name: string) => {
    const items = await localGetGroceryItems();
    const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (item) {
      setGroceryItems((prev) => prev.filter((i) => i.id !== item.id));
      await localRemoveGroceryItem(item.id);

      if (navigator.onLine) {
        try {
          await fetch(`/api/items/${item.id}`, { method: "DELETE" });
          setSyncStatus("synced");
        } catch {
          scheduleSync();
        }
      } else {
        setSyncStatus("offline");
      }
    }
  }, [scheduleSync]);

  const clearCheckedGroceryItems = useCallback(async () => {
    setGroceryItems((prev) => prev.filter((i) => !i.checked));
    await localClearCheckedGroceryItems();

    if (navigator.onLine) {
      try {
        await fetch("/api/items", { method: "DELETE" });
        setSyncStatus("synced");
      } catch {
        scheduleSync();
      }
    } else {
      setSyncStatus("offline");
    }
  }, [scheduleSync]);

  const clearAllGroceryItems = useCallback(async () => {
    const current = await localGetGroceryItems();
    setGroceryItems([]);
    await localClearAllGroceryItems();

    if (navigator.onLine) {
      for (const item of current) {
        try {
          await fetch(`/api/items/${item.id}`, { method: "DELETE" });
        } catch {
          // continue
        }
      }
      setSyncStatus("synced");
    } else {
      setSyncStatus("offline");
      scheduleSync();
    }
  }, [scheduleSync]);

  const toggleRegularItem = useCallback(async (id: string) => {
    setRegularItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );

    const items = await localGetRegularItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      const updated = { ...item, selected: !item.selected };
      await localUpdateRegularItem(updated);
    }

    if (navigator.onLine) {
      try {
        await fetch(`/api/regular-items/${id}`, { method: "PATCH" });
      } catch {
        // silent
      }
    }
  }, []);

  const uploadCsv = useCallback(async (file: File): Promise<{ count: number; errors: string[] }> => {
    const content = await file.text();
    const { items, errors } = parseCsv(content);

    if (items.length === 0) {
      return { count: 0, errors: errors.length > 0 ? errors : ["No valid items found"] };
    }

    // Store locally
    await localSetRegularItems(items);
    setRegularItems(items);

    // Sync full state to server (preserves IDs)
    scheduleSync();

    return { count: items.length, errors };
  }, [scheduleSync]);

  const clearRegularItems = useCallback(async () => {
    setRegularItems([]);
    await localClearRegularItems();

    if (navigator.onLine) {
      try {
        await fetch("/api/regular-items", { method: "DELETE" });
        setSyncStatus("synced");
      } catch {
        scheduleSync();
      }
    } else {
      setSyncStatus("offline");
    }
  }, [scheduleSync]);

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
  }, [addGroceryItem]);

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
