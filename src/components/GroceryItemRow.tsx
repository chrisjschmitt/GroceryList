"use client";

import { GroceryItem } from "@/lib/types";
import PriceComparison from "./PriceComparison";

interface GroceryItemRowProps {
  item: GroceryItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function GroceryItemRow({ item, onToggle, onRemove }: GroceryItemRowProps) {
  const totalBest = item.bestPrice
    ? (item.bestPrice.price * item.quantity).toFixed(2)
    : null;

  return (
    <div
      className={`group p-4 rounded-xl border transition-all ${
        item.checked
          ? "bg-gray-50 border-gray-200 hover:border-amber-300 hover:bg-amber-50/30"
          : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(item.id)}
          className={`mt-1 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            item.checked
              ? "bg-emerald-500 border-emerald-500 text-white hover:bg-amber-500 hover:border-amber-500"
              : "border-gray-300 hover:border-emerald-400"
          }`}
          aria-label={item.checked ? `Uncheck ${item.name} (restore to list)` : `Check off ${item.name}`}
          title={item.checked ? "Click to restore to active list" : "Check off"}
        >
          {item.checked && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3
              className={`text-base font-medium ${
                item.checked ? "line-through text-gray-400 group-hover:text-gray-600" : "text-gray-900"
              }`}
            >
              {item.name}
            </h3>
            <span className="text-sm text-gray-500">
              {item.quantity} {item.unit}
            </span>
            {totalBest && !item.checked && (
              <span className="text-sm font-semibold text-emerald-600">
                est. ${totalBest}
              </span>
            )}
            {item.checked && (
              <span className="text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                click checkbox to restore
              </span>
            )}
          </div>

          {!item.checked && (
            <PriceComparison prices={item.prices} bestPrice={item.bestPrice} />
          )}
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
          aria-label={`Remove ${item.name}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
