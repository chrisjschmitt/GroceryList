"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RegularItem } from "@/lib/types";
import { ScrapeConfig, ScrapeItemConfig } from "@/lib/blob-store";
import CsvUpload from "@/components/CsvUpload";
import { getAutoSaveEnabled, setAutoSaveEnabled } from "@/lib/client/settings";

export default function AdminPage() {
  const [items, setItems] = useState<RegularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoSave, setAutoSave] = useState(() =>
    typeof window !== "undefined" ? getAutoSaveEnabled() : false
  );

  // Scrape config state
  const [scrapeConfig, setScrapeConfig] = useState<ScrapeConfig>({ stores: {} });
  const [scrapeLoading, setScrapeLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", upc: "", url: "" });
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);

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
        const [itemsRes, configRes] = await Promise.all([
          fetch("/api/regular-items"),
          fetch("/api/scrape-config"),
        ]);
        const itemsData = await itemsRes.json();
        const configData = await configRes.json();
        if (!cancelled) {
          setItems(itemsData.items || []);
          if (configData.stores) setScrapeConfig(configData);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) {
          setLoading(false);
          setScrapeLoading(false);
        }
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

  // Ensure foodbasics store exists in config
  const ensureFoodBasicsStore = (config: ScrapeConfig): ScrapeConfig => {
    if (!config.stores.foodbasics) {
      config.stores.foodbasics = {
        enabled: true,
        store_name: "Food Basics",
        base_url: "https://www.foodbasics.ca",
        postal_code: "K7H3C6",
        store_id: "7923194",
        items: [],
      };
    }
    return config;
  };

  const saveScrapeConfig = async (config: ScrapeConfig) => {
    try {
      await fetch("/api/scrape-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setScrapeMsg("Saved!");
      setTimeout(() => setScrapeMsg(null), 2000);
    } catch {
      setScrapeMsg("Failed to save");
    }
  };

  const handleAddScrapeItem = async () => {
    if (!newItem.name.trim() || !newItem.url.trim()) return;

    const config = ensureFoodBasicsStore({ ...scrapeConfig });
    const store = config.stores.foodbasics;

    // Extract UPC from URL if not provided
    let upc = newItem.upc.trim();
    if (!upc) {
      const match = newItem.url.match(/\/p\/(\d+)/);
      upc = match ? match[1] : `manual-${Date.now()}`;
    }

    store.items.push({
      upc,
      name: newItem.name.trim(),
      url: newItem.url.trim(),
    });

    setScrapeConfig(config);
    await saveScrapeConfig(config);
    setNewItem({ name: "", upc: "", url: "" });
    setAddingItem(false);
  };

  const handleRemoveScrapeItem = async (storeKey: string, upc: string) => {
    const config = { ...scrapeConfig };
    const store = config.stores[storeKey];
    if (!store) return;

    store.items = store.items.filter((i: ScrapeItemConfig) => i.upc !== upc);
    setScrapeConfig(config);
    await saveScrapeConfig(config);
  };

  const allScrapeItems = Object.entries(scrapeConfig.stores).flatMap(
    ([storeKey, store]) => store.items.map((item: ScrapeItemConfig) => ({ ...item, storeKey, storeName: store.store_name }))
  );

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
            Manage settings, grocery items, and price checking
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
                  Automatically save changes when you switch away from the app.
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

          {/* Price Check Configuration */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Price Checking</h2>
              {scrapeMsg && (
                <span className="text-xs text-emerald-600 font-medium">{scrapeMsg}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Items listed here will have their prices checked when the scraper runs.
              Add the Food Basics product page URL for each item you want to track.
            </p>

            {scrapeLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
              </div>
            ) : (
              <>
                {allScrapeItems.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {allScrapeItems.map((item) => (
                      <div key={item.upc} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400 truncate">{item.storeName} · {item.upc}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveScrapeItem(item.storeKey, item.upc)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {addingItem ? (
                  <div className="space-y-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <input
                      type="text"
                      placeholder="Item name (e.g. 2% Lactose-Free Milk)"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Food Basics product page URL"
                      value={newItem.url}
                      onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="UPC (optional — auto-extracted from URL)"
                      value={newItem.upc}
                      onChange={(e) => setNewItem({ ...newItem, upc: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddScrapeItem}
                        disabled={!newItem.name.trim() || !newItem.url.trim()}
                        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Add item
                      </button>
                      <button
                        onClick={() => { setAddingItem(false); setNewItem({ name: "", upc: "", url: "" }); }}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingItem(true)}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    + Add item to price check
                  </button>
                )}
              </>
            )}
          </div>

          {/* CSV Upload */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Grocery Items
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
                No grocery items uploaded
              </h3>
              <p className="text-sm text-gray-500">
                Upload a CSV file above to populate your grocery items list
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
