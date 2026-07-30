"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  icon?: string | null;
  relatedId?: string | null;
  earnedAt: Date | string;
}

/**
 * Achievement Grid Component
 * Displays achievements in a responsive grid with pagination
 * 12 per page, sortable by date or type
 */
export function AchievementGrid({ achievements }: { achievements: Achievement[] }) {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<"date" | "type">("date");

  if (achievements.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface-1 p-6">
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">
          Achievements
        </p>
        <div className="text-center py-8">
          <Icon name="achievements" size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm text-ink-3">No achievements yet</p>
          <p className="text-xs text-ink-3 mt-1">
            Complete labs, incidents, and hunts to earn achievements
          </p>
        </div>
      </div>
    );
  }

  // Sort achievements
  const sorted = [...achievements].sort((a, b) => {
    if (sortBy === "date") {
      const dateA = new Date(a.earnedAt).getTime();
      const dateB = new Date(b.earnedAt).getTime();
      return dateB - dateA; // Newest first
    } else {
      return a.type.localeCompare(b.type);
    }
  });

  const itemsPerPage = 12;
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const start = page * itemsPerPage;
  const visible = sorted.slice(start, start + itemsPerPage);

  const getIcon = (type: string) => {
    switch (type) {
      case "LAB_SOLVED":
        return "labs";
      case "INCIDENT_COMPLETED":
        return "siren";
      case "WEEKLY_CERT":
        return "certificates";
      case "HUNT_COMPLETED":
        return "threatIntel";
      case "RULES_SHARED":
        return "share2";
      default:
        return "achievements";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "LAB_SOLVED":
        return "border-ok-edge bg-ok-wash text-ok";
      case "INCIDENT_COMPLETED":
        return "border-sev-high-edge bg-sev-high-wash text-sev-high";
      case "WEEKLY_CERT":
        return "border-warn-edge bg-warn-wash text-warn";
      case "HUNT_COMPLETED":
        return "border-accent-edge bg-accent-wash text-accent";
      case "RULES_SHARED":
        return "border-info-edge bg-info-wash text-info";
      default:
        return "border-edge-strong bg-surface-1 text-ink-2";
    }
  };

  return (
    <div className="rounded-xl border border-edge bg-surface-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs uppercase tracking-widest text-ink-3">
          Achievements ({sorted.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSortBy("date");
              setPage(0);
            }}
            className={`text-xs px-2 py-1 rounded border transition ${
              sortBy === "date"
                ? "border-edge-strong bg-surface-2 text-ink"
                : "border-edge text-ink-3 hover:border-edge-strong"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => {
              setSortBy("type");
              setPage(0);
            }}
            className={`text-xs px-2 py-1 rounded border transition ${
              sortBy === "type"
                ? "border-edge-strong bg-surface-2 text-ink"
                : "border-edge text-ink-3 hover:border-edge-strong"
            }`}
          >
            Type
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {visible.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-lg border p-4 transition hover:bg-surface-2/50 ${getTypeColor(achievement.type)}`}
          >
            <div className="flex items-start gap-3 mb-2">
              <Icon
                name={getIcon(achievement.type) as any}
                size={20}
                variant="current"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-ink truncate">
                  {achievement.title}
                </h4>
                <p className="text-[10px] font-mono uppercase opacity-60 mt-0.5">
                  {achievement.type.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-2 line-clamp-2 mb-3">
              {achievement.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-3">
                {new Date(achievement.earnedAt).toLocaleDateString()}
              </span>
              {achievement.relatedId && (
                <Link
                  href={`/${achievement.type.toLowerCase().split("_")[0]}/${achievement.relatedId}`}
                  className="text-[10px] text-info hover:underline"
                >
                  View →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1.5 rounded border border-edge text-ink-3 disabled:opacity-50 hover:border-edge-strong transition"
          >
            ← Previous
          </button>
          <span className="text-xs text-ink-3">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="text-xs px-3 py-1.5 rounded border border-edge text-ink-3 disabled:opacity-50 hover:border-edge-strong transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
