export type Badge = {
  id: string;
  label: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
};

type AttemptSummary = { status: string; lab: { type: string } };
type SimSummary = { score: number | null };

export function computeBadges(params: {
  attempts: AttemptSummary[];
  simSessions: SimSummary[];
  skillScore: number;
  hasCert: boolean;
}): Badge[] {
  const { attempts, simSessions, skillScore, hasCert } = params;
  const solved = attempts.filter((a) => a.status === "SOLVED");
  const ctfSolved = solved.filter((a) => a.lab.type === "CTF").length;
  const blueSolved = solved.filter((a) => a.lab.type === "BLUE_TEAM").length;
  const redSolved = solved.filter((a) => a.lab.type === "RED_TEAM").length;
  const totalSolved = solved.length;
  const completedSims = simSessions.filter((s) => s.score !== null);
  const bestSim = completedSims.length > 0 ? Math.max(...completedSims.map((s) => s.score!)) : 0;

  const earned: Badge[] = [];

  if (totalSolved >= 1) earned.push({ id: "first_blood", label: "First Blood", description: "Solved your first lab", icon: "🎯", tier: "bronze" });
  if (ctfSolved >= 1)   earned.push({ id: "ctf_hunter", label: "CTF Hunter", description: `Solved ${ctfSolved} CTF lab${ctfSolved > 1 ? "s" : ""}`, icon: "🚩", tier: ctfSolved >= 8 ? "gold" : ctfSolved >= 4 ? "silver" : "bronze" });
  if (blueSolved >= 1)  earned.push({ id: "blue_analyst", label: "Blue Analyst", description: `Solved ${blueSolved} Blue Team lab${blueSolved > 1 ? "s" : ""}`, icon: "🛡️", tier: blueSolved >= 8 ? "gold" : blueSolved >= 4 ? "silver" : "bronze" });
  if (redSolved >= 1)   earned.push({ id: "red_operator", label: "Red Operator", description: `Solved ${redSolved} Red Team lab${redSolved > 1 ? "s" : ""}`, icon: "⚔️", tier: redSolved >= 8 ? "gold" : redSolved >= 4 ? "silver" : "bronze" });
  if (totalSolved >= 10) earned.push({ id: "lab_veteran", label: "Lab Veteran", description: "Solved 10+ labs", icon: "💎", tier: totalSolved >= 20 ? "gold" : "silver" });
  if (ctfSolved >= 1 && blueSolved >= 1 && redSolved >= 1) earned.push({ id: "all_rounder", label: "All-Rounder", description: "Solved labs across all 3 categories", icon: "🌟", tier: "silver" });

  if (completedSims.length >= 1)  earned.push({ id: "soc_responder", label: "SOC Responder", description: "Completed your first simulation", icon: "🔒", tier: "bronze" });
  if (completedSims.length >= 5)  earned.push({ id: "ir_veteran", label: "IR Veteran", description: "Completed 5+ simulations", icon: "🚨", tier: "silver" });
  if (bestSim >= 90)               earned.push({ id: "grade_a", label: "Grade A Analyst", description: "Scored 90+ in a simulation", icon: "🏅", tier: "gold" });
  if (bestSim >= 95)               earned.push({ id: "elite", label: "Elite Responder", description: "Scored 95+ in a simulation", icon: "⭐", tier: "platinum" });

  if (skillScore >= 500)   earned.push({ id: "rising_talent", label: "Rising Talent", description: "500+ skill score", icon: "📈", tier: "bronze" });
  if (skillScore >= 1000)  earned.push({ id: "analyst_ii", label: "Analyst II", description: "1000+ skill score", icon: "🔬", tier: "silver" });
  if (skillScore >= 2000)  earned.push({ id: "principal", label: "Principal", description: "2000+ skill score", icon: "🏆", tier: "gold" });

  if (hasCert) earned.push({ id: "certified", label: "Certified", description: "Earned a verified platform certificate", icon: "🎓", tier: "gold" });

  return earned;
}

export const TIER_STYLE: Record<Badge["tier"], { bg: string; border: string; text: string }> = {
  bronze:   { bg: "bg-orange-500/8",   border: "border-orange-500/25",  text: "text-orange-400" },
  silver:   { bg: "bg-zinc-400/8",     border: "border-zinc-400/25",    text: "text-zinc-300" },
  gold:     { bg: "bg-amber-400/10",   border: "border-amber-400/30",   text: "text-amber-300" },
  platinum: { bg: "bg-emerald-400/10", border: "border-emerald-400/30", text: "text-emerald-300" },
};
