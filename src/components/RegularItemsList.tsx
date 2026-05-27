"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { RegularItem } from "@/lib/types";

interface RegularItemsListProps {
  items: RegularItem[];
  onToggle: (id: string) => Promise<void>;
  onAddToGroceryList: (items: RegularItem[]) => Promise<void>;
  onRemoveFromGroceryList: (name: string) => Promise<void>;
  onUploadCsv: (file: File) => Promise<{ count: number; errors: string[] }>;
  onClear: () => Promise<void>;
  alreadyInList: Set<string>;
}

export default function RegularItemsList({
  items,
  onToggle,
  onAddToGroceryList,
  onRemoveFromGroceryList,
  onUploadCsv,
  onClear,
  alreadyInList,
}: RegularItemsListProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setUploadMsg("Please upload a .csv file");
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const { count, errors } = await onUploadCsv(file);
    if (count > 0) {
      setUploadMsg(errors.length > 0 ? `Imported ${count} items (${errors.length} rows skipped)` : null);
    } else {
      setUploadMsg(errors[0] || "Failed to parse CSV");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleToggle = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (alreadyInList.has(item.name.toLowerCase())) {
      onRemoveFromGroceryList(item.name);
      return;
    }

    onToggle(id);
  };

  const handleAddCategorySelected = (category: string) => {
    const selected = items.filter(
      (i) => i.category === category && i.selected && !alreadyInList.has(i.name.toLowerCase())
    );
    if (selected.length === 0) return;
    onAddToGroceryList(selected);
  };

  const categories = items.reduce<Record<string, RegularItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {/* CSV Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" aria-label="Upload CSV file" />
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm font-medium text-gray-700">{uploading ? "Uploading..." : "Upload your regular items CSV"}</p>
          <p className="text-xs text-gray-400 mt-1">Format: category, item name (one per row)</p>
          {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>}
        </div>
        {uploadMsg && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">{uploadMsg}</p>}

        <div className="text-center py-8">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-base font-medium text-gray-900 mb-1">No regular items yet</h3>
          <p className="text-sm text-gray-500 mb-4">Upload a CSV above or use the Admin page</p>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Go to Admin →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {items.length} regular item{items.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <button onClick={onClear} className="text-xs px-3 py-1.5 text-gray-400 hover:text-red-500 transition-colors">
            Clear list
          </button>
          <Link href="/admin" className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            Admin
          </Link>
        </div>
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
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{category}</h4>
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
                        <span className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          inList
                            ? "bg-emerald-300 border-emerald-300 text-white"
                            : item.selected
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-300"
                        }`}>
                          {(item.selected || inList) && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{item.name}</span>
                        {inList && <span className="ml-auto text-[10px] flex-shrink-0">✕ remove</span>}
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
