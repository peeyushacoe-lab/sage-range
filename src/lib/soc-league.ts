// ── SOC League: coins + rank ladder ──────────────────────────────────────────
// A progression system distinct from skillScore/xp (which measure raw solve
// output). Coins are a slower-accumulating currency meant to back the
// competition/gamification layer (Daily Hunt bonuses today; Detection
// Championship, IOC Olympics, etc. can award coins the same way later).
// Same deterministic-tiers pattern as getRankInfo in cyber-identity.ts.

import { db } from "@/lib/db";

export const SOC_LEAGUE_RANKS = [
  { tier: "recruit",    label: "Recruit",            min: 0,     nextMin: 200,   color: "#52525b" },
  { tier: "operator",   label: "Operator",           min: 200,   nextMin: 600,   color: "#3b82f6" },
  { tier: "analyst",    label: "Senior Analyst",     min: 600,   nextMin: 1500,  color: "#f97316" },
  { tier: "specialist", label: "SOC Specialist",     min: 1500,  nextMin: 3500,  color: "#a855f7" },
  { tier: "lead",       label: "SOC Lead",           min: 3500,  nextMin: 7000,  color: "#f59e0b" },
  { tier: "elite",      label: "Elite Responder",    min: 7000,  nextMin: 15000, color: "#10b981" },
  { tier: "champion",   label: "CyberSage Champion", min: 15000, nextMin: null,  color: "#ec4899" },
] as const;

export type SocLeagueTier = (typeof SOC_LEAGUE_RANKS)[number]["tier"];

export type SocLeagueRank = {
  label: string;
  tier: SocLeagueTier;
  color: string;
  pct: number;
  coinsToNext: number | null;
  nextLabel: string | null;
};

export function getSocLeagueRank(coins: number): SocLeagueRank {
  let idx = 0;
  for (let i = 0; i < SOC_LEAGUE_RANKS.length; i++) {
    if (coins >= SOC_LEAGUE_RANKS[i].min) idx = i;
  }
  const r = SOC_LEAGUE_RANKS[idx];
  const next = idx < SOC_LEAGUE_RANKS.length - 1 ? SOC_LEAGUE_RANKS[idx + 1] : null;
  const pct = next
    ? Math.min(100, Math.round(((coins - r.min) / (next.min - r.min)) * 100))
    : 100;
  return {
    label: r.label,
    tier: r.tier as SocLeagueTier,
    color: r.color,
    pct,
    coinsToNext: next ? Math.max(0, next.min - coins) : null,
    nextLabel: next?.label ?? null,
  };
}

/**
 * Coins earned for a given point award. Coins accumulate roughly 10x slower
 * than skillScore/xp so the rank ladder plays out over many labs, not one.
 */
export function coinsForPoints(points: number): number {
  if (points <= 0) return 0;
  return Math.max(1, Math.round(points / 10));
}

export async function awardCoins(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await db.user.update({ where: { id: userId }, data: { coins: { increment: amount } } });
}
