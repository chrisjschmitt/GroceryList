"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RegularItem } from "@/lib/types";

interface RegularItemsListProps {
  onAddToGroceryList: (items: RegularItem[]) => void;
  onRemoveFromGroceryList: (name: string) => void;
  alreadyInList: Set<string>;
}

export default function RegularItemsList({
  onAddToGroceryList,
  onRemoveFromGroceryList,
  alreadyInList,
}: RegularItemsListProps) {
  const [items, setItems] = useState<RegularItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (alreadyInList.has(item.name.toLowerCase())) {
      onRemoveFromGroceryList(item.name);
      return;
    }

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

  const handleAddCategorySelected = (category: string) => {
    const selected = items.filter(
      (i) => i.category === category && i.selected && !alreadyInList.has(i.name.toLowerCase())
    );
    if (selected.length === 0) return;
    onAddToGroceryList(selected);
    setItems((prev) =>
      prev.map((i) =>
        i.category === category ? { ...i, selected: false } : i
      )
    );
  };

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

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-base font-medium text-gray-900 mb-1">
          No regular items yet
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload a CSV of your regular grocery items in the Admin page
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Go to Admin →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {items.length} regular item{items.length !== 1 ? "s" : ""}
        </p>
        <Link
          href="/admin"
          className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          Manage list
        </Link>
      </div>

      <div className="space-y-5">
        {Object.entries(categories)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryItems]) => {
            const categorySelectedCount = categoryItems.filter(
              (i) => i.selected && !alreadyInList.has(i.name.toLowerCase())
            ).length;

            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {category}
                  </h4>
                  {categorySelectedCount > 0 && (
                    <button
                      onClick={() => handleAddCategorySelected(category)}
                      className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                      Add {categorySelectedCount} to list →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {categoryItems.map((item) => {
                    const inList = alreadyInList.has(item.name.toLowerCase());

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggle(item.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                          inList
                            ? "bg-emerald-50/50 border border-emerald-100 text-emerald-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                            : item.selected
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                              : "bg-white border border-gray-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                        }`}
                        title={inList ? "Click to remove from shopping list" : undefined}
                      >
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            inList
                              ? "bg-emerald-300 border-emerald-300 text-white group-hover:bg-red-400 group-hover:border-red-400"
                              : item.selected
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-gray-300"
                          }`}
                        >
                          {(item.selected || inList) && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{item.name}</span>
                        {inList && (
                          <span className="ml-auto text-[10px] flex-shrink-0">
                            ✕ remove
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
