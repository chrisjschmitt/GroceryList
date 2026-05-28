"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RegularItem } from "@/lib/types";
import CsvUpload from "@/components/CsvUpload";
import { getAutoSaveEnabled, setAutoSaveEnabled } from "@/lib/client/settings";

export default function AdminPage() {
  const [items, setItems] = useState<RegularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoSave, setAutoSave] = useState(() =>
    typeof window !== "undefined" ? getAutoSaveEnabled() : true
  );

  const handleAutoSaveToggle = () => {
    const newValue = !autoSave;
    setAutoSave(newValue);
    setAutoSaveEnabled(newValue);
  };

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

  const handleClear = async () => {
    try {
      await fetch("/api/regular-items", { method: "DELETE" });
      setItems([]);
    } catch {
      // silently fail
    }
  };

  const categories = items.reduce<Record<string, RegularItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span>⚙️</span>
              <span>Admin</span>
            </h1>
            <Link
              href="/"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              ← Back to shopping list
            </Link>
          </div>
          <p className="mt-2 text-gray-500">
            Upload and manage your regular grocery items list
          </p>
        </header>

        <section className="space-y-6">
          {/* Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto-save on leave</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Automatically save changes when you switch away from the app. Uses Vercel Blob put() operations.
                </p>
              </div>
              <button
                onClick={handleAutoSaveToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoSave ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    autoSave ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* CSV Upload */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Regular Items
            </h2>
            <CsvUpload onUploadComplete={fetchItems} />
            <p className="mt-3 text-xs text-gray-400">
              CSV format: first column is the food category, second column is the food item.
              One item per row. Header row is optional.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Current List ({items.length} items)
                </h2>
                <button
                  onClick={handleClear}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(categories)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, categoryItems]) => (
                    <div key={category} className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        {category}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {categoryItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex px-2.5 py-1 bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-100"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                No regular items uploaded
              </h3>
              <p className="text-sm text-gray-500">
                Upload a CSV file above to populate your regular items list
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
