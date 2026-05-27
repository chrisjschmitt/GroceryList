"use client";

import { GroceryItem } from "@/lib/types";

interface GroceryItemRowProps {
  item: GroceryItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function GroceryItemRow({ item, onToggle, onRemove }: GroceryItemRowProps) {
  return (
    <div className="group flex items-start gap-2 py-0.5">
      <button
        onClick={() => onToggle(item.id)}
        className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          item.checked
            ? "bg-emerald-500 border-emerald-500 text-white hover:bg-amber-500 hover:border-amber-500"
            : "border-gray-300 hover:border-emerald-400"
        }`}
        aria-label={item.checked ? `Uncheck ${item.name}` : `Check off ${item.name}`}
        title={item.checked ? "Click to restore" : "Check off"}
      >
        {item.checked && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-tight ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}>
          {item.name}
        </span>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
        aria-label={`Remove ${item.name}`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
