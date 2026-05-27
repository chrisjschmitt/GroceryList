"use client";

import { SyncStatus } from "@/lib/client/sync";

interface SyncIndicatorProps {
  status: SyncStatus;
  isOnline: boolean;
}

export default function SyncIndicator({ status, isOnline }: SyncIndicatorProps) {
  if (status === "synced" && isOnline) return null;

  const config = {
    syncing: { icon: "↻", text: "Syncing...", className: "text-blue-600 bg-blue-50 border-blue-200" },
    offline: { icon: "○", text: "Offline — changes saved locally", className: "text-amber-700 bg-amber-50 border-amber-200" },
    error: { icon: "!", text: "Sync error — will retry when online", className: "text-red-600 bg-red-50 border-red-200" },
    synced: { icon: "✓", text: "Synced", className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  };

  const c = config[status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${c.className}`}>
      <span>{c.icon}</span>
      <span>{c.text}</span>
    </div>
  );
}
