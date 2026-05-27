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
import { pullFromServer, pushDirtyToServer, syncAllToServer, SyncStatus, DirtyFlag } from "./sync";
import { parseCsv } from "../csv-parser";

const SYNC_INTERVAL = 30_000;

export interface OfflineStore {
  groceryItems: GroceryItem[];
  regularItems: RegularItem[];
  syncStatus: SyncStatus;
  isOnline: boolean;
  lastSynced: Date | null;
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
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const dirtyRef = useRef<Set<DirtyFlag>>(new Set());

  const markSynced = useCallback(() => {
    setSyncStatus("synced");
    setLastSynced(new Date());
  }, []);

  const markDirty = useCallback((flag: DirtyFlag) => {
    dirtyRef.current.add(flag);
    setSyncStatus("syncing");
  }, []);

  // Single sync tick: push dirty changes OR pull fresh data
  const syncTick = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    if (dirtyRef.current.size > 0) {
      // Push local changes to server
      const toFlush = new Set(dirtyRef.current);
      dirtyRef.current.clear();

      setSyncStatus("syncing");
      const result = await pushDirtyToServer(toFlush);

      if (result.success) {
        markSynced();
      } else {
        // Put flags back for next tick
        toFlush.forEach((f) => dirtyRef.current.add(f));
        setSyncStatus("offline");
      }
    } else {
      // No local changes — pull from server (picks up changes from other devices)
      const serverData = await pullFromServer();
      if (serverData) {
        setGroceryItems(serverData.groceryItems);
        setRegularItems(serverData.regularItems);
        markSynced();
      }
    }
  }, [markSynced]);

  // Load from IndexedDB on mount, then do initial server reconciliation
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

      setSyncStatus("syncing");
      const serverData = await pullFromServer();

      if (!serverData) {
        setSyncStatus("offline");
        return;
      }

      const serverHasData =
        serverData.groceryItems.length > 0 || serverData.regularItems.length > 0;
      const localHasData = localGrocery.length > 0 || localRegular.length > 0;

      if (serverHasData) {
        setGroceryItems(serverData.groceryItems);
        setRegularItems(serverData.regularItems);
        markSynced();
      } else if (localHasData) {
        const result = await syncAllToServer();
        if (result.success) {
          markSynced();
        } else {
          setSyncStatus("offline");
        }
      } else {
        markSynced();
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run sync tick every 30 seconds
  useEffect(() => {
    const interval = setInterval(syncTick, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [syncTick]);

  // Also sync when tab becomes visible (user switches back to app)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        syncTick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncTick]);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncTick();
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
  }, [syncTick]);

  // --- Mutations: write to IndexedDB + update React state + mark dirty ---

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
    markDirty("grocery");
  }, [markDirty]);

  const toggleGroceryItem = useCallback(async (id: string) => {
    setGroceryItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );

    const items = await localGetGroceryItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      await localUpdateGroceryItem({ ...item, checked: !item.checked });
    }

    markDirty("grocery");
  }, [markDirty]);

  const removeGroceryItem = useCallback(async (id: string) => {
    setGroceryItems((prev) => prev.filter((i) => i.id !== id));
    await localRemoveGroceryItem(id);
    markDirty("grocery");
  }, [markDirty]);

  const removeGroceryItemByName = useCallback(async (name: string) => {
    const items = await localGetGroceryItems();
    const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (item) {
      setGroceryItems((prev) => prev.filter((i) => i.id !== item.id));
      await localRemoveGroceryItem(item.id);
      markDirty("grocery");
    }
  }, [markDirty]);

  const clearCheckedGroceryItems = useCallback(async () => {
    setGroceryItems((prev) => prev.filter((i) => !i.checked));
    await localClearCheckedGroceryItems();
    markDirty("grocery");
  }, [markDirty]);

  const clearAllGroceryItems = useCallback(async () => {
    setGroceryItems([]);
    await localClearAllGroceryItems();
    markDirty("grocery");
  }, [markDirty]);

  const toggleRegularItem = useCallback(async (id: string) => {
    setRegularItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );

    const items = await localGetRegularItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      await localUpdateRegularItem({ ...item, selected: !item.selected });
    }

    markDirty("regular");
  }, [markDirty]);

  const uploadCsv = useCallback(async (file: File): Promise<{ count: number; errors: string[] }> => {
    const content = await file.text();
    const { items, errors } = parseCsv(content);

    if (items.length === 0) {
      return { count: 0, errors: errors.length > 0 ? errors : ["No valid items found"] };
    }

    await localSetRegularItems(items);
    setRegularItems(items);
    markDirty("regular");

    return { count: items.length, errors };
  }, [markDirty]);

  const clearRegularItems = useCallback(async () => {
    setRegularItems([]);
    await localClearRegularItems();
    markDirty("regular");
  }, [markDirty]);

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
    markDirty("regular");
  }, [addGroceryItem, markDirty]);

  return {
    groceryItems,
    regularItems,
    syncStatus,
    isOnline,
    lastSynced,
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
