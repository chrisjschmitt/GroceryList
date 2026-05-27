"use client";

import { SyncStatus } from "@/lib/client/sync";

interface SyncIndicatorProps {
  status: SyncStatus;
  isOnline: boolean;
}

export default function SyncIndicator({ status, isOnline }: SyncIndicatorProps) {
  // Only show indicator when there's something noteworthy
  if (status === "synced" && isOnline) return null;

  if (status === "syncing") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border text-blue-600 bg-blue-50 border-blue-200">
        <span className="animate-spin">↻</span>
        <span>Syncing...</span>
      </div>
    );
  }

  // For "offline" or "error" — both mean data is saved locally
  if (!isOnline || status === "offline" || status === "error") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border text-amber-700 bg-amber-50 border-amber-200">
        <span>○</span>
        <span>Offline — changes saved locally</span>
      </div>
    );
  }

  return null;
}
