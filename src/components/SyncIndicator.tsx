"use client";

import { useState } from "react";
import { SyncStatus } from "@/lib/client/sync";

interface SyncIndicatorProps {
  status: SyncStatus;
  isOnline: boolean;
  lastSynced: Date | null;
  hasPendingChanges: boolean;
  onSave: () => Promise<void>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function SyncIndicator({ status, isOnline, lastSynced, hasPendingChanges, onSave }: SyncIndicatorProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
  };

  if (saving) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border text-blue-600 bg-blue-50 border-blue-200">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span>Saving...</span>
      </div>
    );
  }

  if (hasPendingChanges && isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Unsaved changes</span>
        <button
          onClick={handleSave}
          className="ml-1 px-2 py-0.5 bg-amber-600 text-white rounded-full text-xs hover:bg-amber-700 transition-colors"
        >
          Save
        </button>
      </div>
    );
  }

  if (!isOnline || status === "offline" || status === "error") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border text-amber-700 bg-amber-50 border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>Offline{hasPendingChanges ? " — unsaved changes" : ""}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border text-emerald-700 bg-emerald-50 border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-400" />
      <span>Synced{lastSynced ? ` · ${timeAgo(lastSynced)}` : ""}</span>
    </div>
  );
}
