"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

export interface VisitorLogEntry {
  id: string;
  visitorId?: string | null;
  viewedAt: Date | string;
  visitor?: {
    id: string;
    displayName?: string | null;
    email: string;
  } | null;
}

/**
 * Visitor Analytics Component
 * Shows view statistics and recent visitors (portfolio owner only)
 */
export function VisitorStats({
  recentVisitors,
  totalViews30d,
  uniqueVisitors30d,
  isLoading = false,
}: {
  recentVisitors?: VisitorLogEntry[];
  totalViews30d?: number;
  uniqueVisitors30d?: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-edge bg-surface-1 p-6">
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">
          Visitor Analytics
        </p>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 bg-surface-2 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recentVisitors) {
    return null;
  }

  return (
    <div className="rounded-xl border border-edge bg-surface-1 p-6">
      <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">
        Visitor Analytics (30 days)
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg border border-edge-subtle bg-surface-0/50 p-3">
          <p className="text-2xl font-black text-ink tabular-nums">
            {totalViews30d ?? 0}
          </p>
          <p className="text-[10px] text-ink-3 uppercase tracking-wider mt-0.5">
            Total Views
          </p>
        </div>
        <div className="rounded-lg border border-edge-subtle bg-surface-0/50 p-3">
          <p className="text-2xl font-black text-ink tabular-nums">
            {uniqueVisitors30d ?? 0}
          </p>
          <p className="text-[10px] text-ink-3 uppercase tracking-wider mt-0.5">
            Unique Visitors
          </p>
        </div>
      </div>

      {/* Recent visitors list */}
      {recentVisitors.length > 0 ? (
        <div>
          <p className="text-xs text-ink-3 mb-3">Recent Visitors</p>
          <div className="space-y-2">
            {recentVisitors.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b border-edge-subtle last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon name="user" size={16} variant="current" className="text-ink-3 shrink-0" />
                  <span className="text-ink-2 truncate">
                    {entry.visitor?.displayName || entry.visitor?.email || "Anonymous"}
                  </span>
                </div>
                <span className="text-xs text-ink-3 shrink-0 ml-2">
                  {new Date(entry.viewedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-3">No visitors yet</p>
      )}
    </div>
  );
}
