import { type IconName } from "@/components/ui/icon";
// ── Rank System ────────────────────────────────────────────────────────────────
// 9 deterministic tiers, single source of truth. Top tiers (Master, Legend)
// are deliberately hard to reach — early builds put a top scorer of ~27k
// already at Master with 6/8 of an active team maxed out, so the upper
// half of the ladder was stretched out to keep those tiers rare/aspirational
// even as skill scores keep climbing with more content.

export const RANKS = [
  { tier: "recruit",  label: "Recruit",  min: 0,     nextMin: 100,   color: "#52525b" },
  { tier: "bronze",   label: "Bronze",   min: 100,   nextMin: 600,   color: "#f97316" },
  { tier: "silver",   label: "Silver",   min: 600,   nextMin: 1500,  color: "#94a3b8" },
  { tier: "gold",     label: "Gold",     min: 1500,  nextMin: 4000,  color: "#f59e0b" },
  { tier: "platinum", label: "Platinum", min: 4000,  nextMin: 9000,  color: "#2dd4bf" },
  { tier: "diamond",  label: "Diamond",  min: 9000,  nextMin: 18000, color: "#38bdf8" },
  { tier: "elite",    label: "Elite",    min: 18000, nextMin: 35000, color: "#a78bfa" },
  { tier: "master",   label: "Master",   min: 35000, nextMin: 60000, color: "#f472b6" },
  { tier: "legend",   label: "Legend",   min: 60000, nextMin: null,  color: "#facc15" },
] as const;

export type RankTier = (typeof RANKS)[number]["tier"];

// Shared badge-pill classes so every consumer (org dashboard, member detail
// page, etc.) stays in sync instead of each keeping its own copy.
export const RANK_BADGE_CLASS: Record<RankTier, string> = {
  recruit:  "text-zinc-400 border-zinc-500/30 bg-zinc-500/8",
  bronze:   "text-orange-400 border-orange-500/30 bg-orange-500/8",
  silver:   "text-slate-300 border-slate-400/30 bg-slate-400/8",
  gold:     "text-amber-400 border-amber-500/30 bg-amber-500/8",
  platinum: "text-teal-300 border-teal-400/30 bg-teal-400/8",
  diamond:  "text-sky-300 border-sky-400/30 bg-sky-400/8",
  elite:    "text-violet-300 border-violet-400/30 bg-violet-400/8",
  master:   "text-pink-300 border-pink-400/30 bg-pink-400/8",
  legend:   "text-yellow-300 border-yellow-400/30 bg-yellow-400/8",
};

export const TOP_RANK_TIER: RankTier = RANKS[RANKS.length - 1].tier;

export type RankInfo = {
  label: string;
  tier: RankTier;
  color: string;
  pct: number;
  nextLabel: string | null;
};

export function getRankInfo(skillScore: number): RankInfo {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (skillScore >= RANKS[i].min) idx = i;
  }
  const r = RANKS[idx];
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  const pct = next
    ? Math.min(100, Math.round(((skillScore - r.min) / (next.min - r.min)) * 100))
    : 100;
  return { label: r.label, tier: r.tier as RankTier, color: r.color, pct, nextLabel: next?.label ?? null };
}

// ── Role Badge ─────────────────────────────────────────────────────────────────
// >60% dominance required; Explorer is the fallback (no blank state)

export type RoleBadge = { label: string; icon: IconName; color: string };

export function computeRoleBadge(solvedLabTypes: string[]): RoleBadge {
  const total = solvedLabTypes.length;

  if (total === 0) {
    return { label: "Explorer", icon: "compass", color: "text-zinc-500" };
  }

  const ctf  = solvedLabTypes.filter((t) => t === "CTF").length;
  const blue = solvedLabTypes.filter((t) => t === "BLUE_TEAM").length;
  const red  = solvedLabTypes.filter((t) => t === "RED_TEAM").length;

  // Full Spectrum: 6+ labs in EACH of the 3 types
  if (ctf >= 6 && blue >= 6 && red >= 6) {
    return { label: "Full Spectrum", icon: "simulations", color: "text-purple-400" };
  }

  // >60% dominance
  if (ctf / total > 0.6)  return { label: "CTF Specialist", icon: "challenges", color: "text-amber-400" };
  if (red / total > 0.6)  return { label: "Red Team",       icon: "redTeam",  color: "text-red-400"  };
  if (blue / total > 0.6) return { label: "Blue Team",      icon: "blueTeam",  color: "text-blue-400" };

  // No dominant type
  return { label: "Explorer", icon: "compass", color: "text-zinc-400" };
}

// ── Skill Emblems ──────────────────────────────────────────────────────────────
// Weighted scoring: Easy=1, Medium=2, Hard=3, Insane=4, Simulation=5
// Decay: score degrades for labs not solved recently

const DIFF_WEIGHT: Record<string, number> = {
  EASY: 1, MEDIUM: 2, HARD: 3, INSANE: 4,
};

function recencyDecay(solvedAt: Date): number {
  const days = (Date.now() - solvedAt.getTime()) / 86_400_000;
  if (days <= 30)  return 1.0;
  if (days <= 90)  return 0.9;
  if (days <= 180) return 0.75;
  return 0.5;
}

export type SolvedLabInput = {
  category: string;
  difficulty: string;
  solvedAt: Date;
};

export type SkillEmblem = {
  category: string;
  icon: IconName;
  score: number;
  count: number;
  confidence: number; // 0–100 normalised relative to top skill
};

export function computeSkillEmblems(
  solvedLabs: SolvedLabInput[],
  completedSimCount = 0
): SkillEmblem[] {
  const score: Record<string, number> = {};
  const count: Record<string, number> = {};

  for (const lab of solvedLabs) {
    const w = DIFF_WEIGHT[lab.difficulty] ?? 1;
    const weighted = w * recencyDecay(lab.solvedAt);
    score[lab.category] = (score[lab.category] ?? 0) + weighted;
    count[lab.category] = (count[lab.category] ?? 0) + 1;
  }

  // Simulations add 5 pts to the top category (no fixed category of their own)
  if (completedSimCount > 0) {
    const top = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) {
      score[top] += completedSimCount * 5;
    } else {
      // No lab solves yet — create an Incident Response emblem from sims alone
      score["Incident Response"] = (score["Incident Response"] ?? 0) + completedSimCount * 5;
      count["Incident Response"] = (count["Incident Response"] ?? 0) + completedSimCount;
    }
  }

  const allScores = Object.values(score);
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 1;

  return Object.entries(score)
    .map(([category, s]) => ({
      category,
      icon: getCategoryIcon(category),
      score: s,
      count: count[category] ?? 0,
      confidence: Math.min(100, Math.round((s / maxScore) * 100)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// ── Category Icons ─────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, IconName> = {
  "web":                  "globe",
  "web application":      "globe",
  "active directory":     "org",
  "forensics":            "forensics",
  "network forensics":    "forensics",
  "memory forensics":     "forensics",
  "osint":                "eye",
  "network":              "networkMap",
  "malware":              "malware",
  "malware analysis":     "malware",
  "privilege escalation": "escalate",
  "incident response":    "alert",
  "cryptography":         "crypto",
  "reverse engineering":  "tools",
  "phishing":             "phishing",
  "sql injection":        "injection",
  "xss":                  "socialEng",
  "social engineering":   "socialEng",
  "cloud":                "cloud",
  "recon":                "recon",
  "enumeration":          "recon",
};

export function getCategoryIcon(category: string): IconName {
  return CATEGORY_ICON[category.toLowerCase()] ?? "research";
}
