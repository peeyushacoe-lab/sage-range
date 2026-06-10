export const RANKS = [
  { label: "Recruit",        min: 0,    color: "#52525b", tier: "recruit" },
  { label: "Analyst I",      min: 100,  color: "#f97316", tier: "bronze"  },
  { label: "Analyst II",     min: 300,  color: "#fb923c", tier: "bronze"  },
  { label: "Senior Analyst", min: 600,  color: "#94a3b8", tier: "silver"  },
  { label: "Lead Analyst",   min: 1000, color: "#f59e0b", tier: "gold"    },
  { label: "Principal",      min: 2000, color: "#10b981", tier: "elite"   },
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

export type RoleBadge = { label: string; icon: string; color: string };

export function computeRoleBadge(solvedLabTypes: string[]): RoleBadge | null {
  if (solvedLabTypes.length === 0) return null;
  const ctf  = solvedLabTypes.filter((t) => t === "CTF").length;
  const blue = solvedLabTypes.filter((t) => t === "BLUE_TEAM").length;
  const red  = solvedLabTypes.filter((t) => t === "RED_TEAM").length;
  const total = ctf + blue + red;
  if (total === 0) return null;

  if (ctf > 0 && blue > 0 && red > 0 && total >= 6) {
    return { label: "Full Spectrum", icon: "🎯", color: "text-purple-400" };
  }
  const dom = ctf >= blue && ctf >= red ? "CTF" : red >= blue ? "RED_TEAM" : "BLUE_TEAM";
  if (dom === "CTF")      return { label: "CTF Specialist", icon: "🚩", color: "text-amber-400"  };
  if (dom === "RED_TEAM") return { label: "Red Team",       icon: "⚔️",  color: "text-red-400"   };
  return                         { label: "Blue Team",      icon: "🛡️",  color: "text-blue-400"  };
}

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
