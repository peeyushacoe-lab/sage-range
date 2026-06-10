// ── Rank System ────────────────────────────────────────────────────────────────
// 5 deterministic tiers, single source of truth

export const RANKS = [
  { tier: "recruit", label: "Recruit", min: 0,    nextMin: 100,  color: "#52525b" },
  { tier: "bronze",  label: "Bronze",  min: 100,  nextMin: 600,  color: "#f97316" },
  { tier: "silver",  label: "Silver",  min: 600,  nextMin: 1000, color: "#94a3b8" },
  { tier: "gold",    label: "Gold",    min: 1000, nextMin: 2000, color: "#f59e0b" },
  { tier: "elite",   label: "Elite",   min: 2000, nextMin: null, color: "#10b981" },
] as const;

export type RankTier = "recruit" | "bronze" | "silver" | "gold" | "elite";

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

export type RoleBadge = { label: string; icon: string; color: string };

export function computeRoleBadge(solvedLabTypes: string[]): RoleBadge {
  const total = solvedLabTypes.length;

  if (total === 0) {
    return { label: "Explorer", icon: "🔭", color: "text-zinc-500" };
  }

  const ctf  = solvedLabTypes.filter((t) => t === "CTF").length;
  const blue = solvedLabTypes.filter((t) => t === "BLUE_TEAM").length;
  const red  = solvedLabTypes.filter((t) => t === "RED_TEAM").length;

  // Full Spectrum: 6+ labs in EACH of the 3 types
  if (ctf >= 6 && blue >= 6 && red >= 6) {
    return { label: "Full Spectrum", icon: "🎯", color: "text-purple-400" };
  }

  // >60% dominance
  if (ctf / total > 0.6)  return { label: "CTF Specialist", icon: "🚩", color: "text-amber-400" };
  if (red / total > 0.6)  return { label: "Red Team",       icon: "⚔️",  color: "text-red-400"  };
  if (blue / total > 0.6) return { label: "Blue Team",      icon: "🛡️",  color: "text-blue-400" };

  // No dominant type
  return { label: "Explorer", icon: "🔭", color: "text-zinc-400" };
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
  icon: string;
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

const CATEGORY_ICON: Record<string, string> = {
  "web":                  "🌐",
  "web application":      "🌐",
  "active directory":     "🏢",
  "forensics":            "🔍",
  "network forensics":    "🔍",
  "memory forensics":     "🔍",
  "osint":                "👁️",
  "network":              "🕸️",
  "malware":              "🦠",
  "malware analysis":     "🦠",
  "privilege escalation": "⬆️",
  "incident response":    "🚨",
  "cryptography":         "🔐",
  "reverse engineering":  "🔧",
  "phishing":             "🎣",
  "sql injection":        "💉",
  "xss":                  "✂️",
  "social engineering":   "🎭",
  "cloud":                "☁️",
  "recon":                "🗺️",
  "enumeration":          "📡",
};

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICON[category.toLowerCase()] ?? "🔬";
}
