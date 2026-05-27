"use client";

import { useState, useEffect, useMemo } from "react";
import { GroceryItem, RegularItem } from "@/lib/types";
import AddItemForm from "./AddItemForm";
import GroceryItemRow from "./GroceryItemRow";
import RegularItemsList from "./RegularItemsList";

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/items");
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Failed to load items");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const shoppingListNames = useMemo(
    () => new Set(items.map((i) => i.name.toLowerCase())),
    [items]
  );

  const handleAdd = async (name: string, quantity: number, unit: string) => {
    if (shoppingListNames.has(name.toLowerCase())) {
      setError(`"${name}" is already in your shopping list`);
      return;
    }

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity, unit }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) => [...prev, data.item]);
      } else {
        setError(data.error || "Failed to add item");
      }
    } catch {
      setError("Failed to add item");
    }
  };

  const handleAddFromRegularList = async (regularItems: RegularItem[]) => {
    const newItems = regularItems.filter(
      (ri) => !shoppingListNames.has(ri.name.toLowerCase())
    );

    for (const ri of newItems) {
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: ri.name, quantity: 1, unit: "unit" }),
        });
        const data = await res.json();
        if (res.ok) {
          setItems((prev) => [...prev, data.item]);
        }
      } catch {
        // continue with remaining items
      }
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
      }
    } catch {
      setError("Failed to update item");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      setError("Failed to remove item");
    }
  };

  const handleClearChecked = async () => {
    try {
      const res = await fetch("/api/items", { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => !i.checked));
      }
    } catch {
      setError("Failed to clear items");
    }
  };

  const handleClearAll = async () => {
    for (const item of items) {
      try {
        await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      } catch {
        // continue
      }
    }
    setItems([]);
  };

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  const totalEstimate = uncheckedItems.reduce((sum, item) => {
    if (item.bestPrice) {
      return sum + item.bestPrice.price * item.quantity;
    }
    return sum;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left panel: Regular Items checklist */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span>
          <span>Regular Items</span>
        </h2>
        <RegularItemsList
          onAddToGroceryList={handleAddFromRegularList}
          alreadyInList={shoppingListNames}
        />
      </section>

      {/* Right panel: Shopping List */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🛍️</span>
          <span>Shopping List</span>
        </h2>

        <div className="space-y-4">
          <AddItemForm onAdd={handleAdd} />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} remaining
                {totalEstimate > 0 && (
                  <span className="ml-2 font-semibold text-emerald-600">
                    Est. total: ${totalEstimate.toFixed(2)}
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                {checkedItems.length > 0 && (
                  <button
                    onClick={handleClearChecked}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear checked
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {uncheckedItems.map((item) => (
              <GroceryItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {checkedItems.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Checked off
              </h3>
              {checkedItems.map((item) => (
                <GroceryItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🛒</div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                Shopping list is empty
              </h3>
              <p className="text-sm text-gray-500">
                Add items manually above or check items from your regular list
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
