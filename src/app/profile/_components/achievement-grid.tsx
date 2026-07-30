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
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
          Achievements
        </p>
        <div className="text-center py-8">
          <Icon name="achievements" size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm text-zinc-500">No achievements yet</p>
          <p className="text-xs text-zinc-600 mt-1">
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
        return "border-teal-500/30 bg-teal-500/8 text-teal-400";
      case "INCIDENT_COMPLETED":
        return "border-orange-500/30 bg-orange-500/8 text-orange-400";
      case "WEEKLY_CERT":
        return "border-amber-500/30 bg-amber-500/8 text-amber-400";
      case "HUNT_COMPLETED":
        return "border-purple-500/30 bg-purple-500/8 text-purple-400";
      case "RULES_SHARED":
        return "border-blue-500/30 bg-blue-500/8 text-blue-400";
      default:
        return "border-zinc-600 bg-zinc-900 text-zinc-400";
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500">
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
                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                : "border-white/10 text-zinc-500 hover:border-white/20"
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
                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                : "border-white/10 text-zinc-500 hover:border-white/20"
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
            className={`rounded-lg border p-4 transition hover:bg-zinc-800/50 ${getTypeColor(achievement.type)}`}
          >
            <div className="flex items-start gap-3 mb-2">
              <Icon
                name={getIcon(achievement.type) as any}
                size={20}
                variant="current"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-zinc-100 truncate">
                  {achievement.title}
                </h4>
                <p className="text-[10px] font-mono uppercase opacity-60 mt-0.5">
                  {achievement.type.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
              {achievement.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">
                {new Date(achievement.earnedAt).toLocaleDateString()}
              </span>
              {achievement.relatedId && (
                <Link
                  href={`/${achievement.type.toLowerCase().split("_")[0]}/${achievement.relatedId}`}
                  className="text-[10px] text-blue-400 hover:underline"
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
            className="text-xs px-3 py-1.5 rounded border border-white/10 text-zinc-500 disabled:opacity-50 hover:border-white/20 transition"
          >
            ← Previous
          </button>
          <span className="text-xs text-zinc-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="text-xs px-3 py-1.5 rounded border border-white/10 text-zinc-500 disabled:opacity-50 hover:border-white/20 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
