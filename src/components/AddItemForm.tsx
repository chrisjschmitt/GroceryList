"use client";

import { useState } from "react";

interface AddItemFormProps {
  onAdd: (name: string, quantity: number, unit: string) => void;
  disabled?: boolean;
}

const COMMON_UNITS = ["unit", "lb", "oz", "gal", "dozen", "bunch", "bag", "can", "box"];

export default function AddItemForm({ onAdd, disabled }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("unit");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), quantity, unit);
    setName("");
    setQuantity(1);
    setUnit("unit");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add an item (e.g. milk, eggs, bread...)"
        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base"
        disabled={disabled}
        aria-label="Item name"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          min={1}
          className="w-20 px-3 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={disabled}
          aria-label="Quantity"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="px-3 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={disabled}
          aria-label="Unit"
        >
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={disabled || !name.trim()}
          className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </form>
  );
}
