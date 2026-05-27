"use client";

import { useState, useEffect } from "react";
import { RegularItem } from "@/lib/types";
import CsvUpload from "./CsvUpload";

interface RegularItemsListProps {
  onAddToGroceryList: (items: RegularItem[]) => void;
}

export default function RegularItemsList({ onAddToGroceryList }: RegularItemsListProps) {
  const [items, setItems] = useState<RegularItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/regular-items");
      const data = await res.json();
      setItems(data.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/regular-items");
        const data = await res.json();
        if (!cancelled) setItems(data.items);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/regular-items/${id}`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
      }
    } catch {
      // silently fail
    }
  };

  const handleAddSelected = () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;
    onAddToGroceryList(selected);
    setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
  };

  const handleClear = async () => {
    try {
      await fetch("/api/regular-items", { method: "DELETE" });
      setItems([]);
    } catch {
      // silently fail
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const categories = items.reduce<Record<string, RegularItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CsvUpload onUploadComplete={fetchItems} />

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {items.length} regular item{items.length !== 1 ? "s" : ""}
              {selectedCount > 0 && (
                <span className="ml-1 font-semibold text-emerald-600">
                  ({selectedCount} selected)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              {selectedCount > 0 && (
                <button
                  onClick={handleAddSelected}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Add {selectedCount} to shopping list →
                </button>
              )}
              <button
                onClick={handleClear}
                className="text-xs px-3 py-1.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear list
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(categories)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryItems]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToggle(item.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                          item.selected
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-white border border-gray-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            item.selected
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {item.selected && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {items.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          Upload a CSV to see your regular items here
        </p>
      )}
    </div>
  );
}
