import React from "react";
import { StatCard } from "@/components/ui/stat-card";

export interface PortfolioStats {
  totalLabsSolved: number;
  totalIncidentsSolved: number;
  totalWeeklyCerts: number;
  totalCompetitionsWon: number;
  totalRulesShared: number;
  huntsCompleted: number;
}

/**
 * Portfolio Stats Cards Component
 * Displays key statistics in a responsive grid
 */
export function StatsCards({ stats, isLoading = false }: { stats?: PortfolioStats; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-white/8 bg-zinc-900/40 p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    { label: "Labs Solved", value: stats.totalLabsSolved },
    { label: "Incidents Completed", value: stats.totalIncidentsSolved },
    { label: "Weekly Certificates", value: stats.totalWeeklyCerts },
    { label: "Competitions Won", value: stats.totalCompetitionsWon },
    { label: "Detection Rules Shared", value: stats.totalRulesShared },
    { label: "Hunts Completed", value: stats.huntsCompleted },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ label, value }) => (
        <StatCard key={label} label={label} value={value} />
      ))}
    </div>
  );
}
