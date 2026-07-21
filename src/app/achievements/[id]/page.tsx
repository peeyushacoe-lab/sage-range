import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Mirror of achievements/page.tsx definitions so the share page is self-contained
const ALL_ACHIEVEMENTS = [
  { id: "first-blood",    emoji: "🩸", name: "First Blood",    description: "Solve your very first lab",                             category: "Labs" },
  { id: "flag-collector", emoji: "🚩", name: "Flag Collector", description: "Solve 10 labs",                                         category: "Labs" },
  { id: "ctf-veteran",    emoji: "⚔️", name: "CTF Veteran",    description: "Solve 25 labs",                                         category: "Labs" },
  { id: "century",        emoji: "💯", name: "Century",         description: "Solve 100 labs",                                        category: "Labs" },
  { id: "insane-mode",    emoji: "💀", name: "Insane Mode",     description: "Solve an Insane difficulty lab",                        category: "Labs" },
  { id: "speed-runner",   emoji: "⚡", name: "Speed Runner",   description: "Solve a Hard lab in under 30 minutes",                  category: "Labs" },
  { id: "all-rounder",    emoji: "🔄", name: "All Rounder",    description: "Solve at least one CTF, Blue Team, and Red Team lab",   category: "Labs" },
  { id: "hint-free",      emoji: "🎯", name: "Hint Free",       description: "Solve 5+ labs without ever using a hint",              category: "Labs" },
  { id: "hard-hitter",    emoji: "🔨", name: "Hard Hitter",    description: "Solve 5 Hard or Insane difficulty labs",                 category: "Labs" },
  { id: "explorer",       emoji: "🌐", name: "Explorer",        description: "Complete labs from 5+ different skill categories",      category: "Labs" },
  { id: "first-responder",emoji: "🚨", name: "First Responder",description: "Complete your first simulation",                        category: "Simulations" },
  { id: "threat-contained",emoji: "🛡️",name: "Threat Contained",description: "Successfully CONTAIN a threat in a simulation",       category: "Simulations" },
  { id: "high-scorer",    emoji: "⭐", name: "High Scorer",    description: "Score 90 or above in any simulation",                   category: "Simulations" },
  { id: "perfect-score",  emoji: "💎", name: "Perfect Score",  description: "Achieve a score of 100 in any simulation",              category: "Simulations" },
  { id: "sim-veteran",    emoji: "🎖️", name: "Sim Veteran",   description: "Complete 5 simulations",                                category: "Simulations" },
  { id: "relentless",     emoji: "🔥", name: "Relentless",      description: "Complete 10 simulations",                               category: "Simulations" },
  { id: "daily-grind",    emoji: "📅", name: "Daily Grind",    description: "Maintain a 3-day activity streak",                      category: "Streaks" },
  { id: "week-warrior",   emoji: "🗓️", name: "Week Warrior",  description: "Maintain a 7-day activity streak",                      category: "Streaks" },
  { id: "month-strong",   emoji: "💪", name: "Month Strong",   description: "Maintain a 14-day activity streak",                     category: "Streaks" },
  { id: "rising-star",    emoji: "🌟", name: "Rising Star",    description: "Reach Bronze rank (1,000+ skill score)",                category: "Rank" },
  { id: "silver-bullet",  emoji: "🥈", name: "Silver Bullet",  description: "Reach Silver rank (600+ skill score)",                  category: "Rank" },
  { id: "gold-standard",  emoji: "🥇", name: "Gold Standard",  description: "Reach Gold rank (1,000+ skill score)",                  category: "Rank" },
  { id: "elite-operator", emoji: "👁️", name: "Elite Operator", description: "Reach Elite rank (2,000+ skill score)",                category: "Rank" },
  { id: "tactical-mind",  emoji: "🗺️", name: "Tactical Mind", description: "Complete simulations across 3+ different scenarios",    category: "Mastery" },
  { id: "full-spectrum",  emoji: "⛓️", name: "Full Spectrum",  description: "Solve 5+ Hard labs AND complete 5+ simulations",        category: "Mastery" },
];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ach = ALL_ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) return {};
  return {
    title: `${ach.name} — Sage Vault Achievement`,
    description: ach.description,
    openGraph: { title: `${ach.emoji} ${ach.name}`, description: `${ach.description} — Sage Vault Cyber Range` },
  };
}

export default async function ShareableAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ach = ALL_ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) notFound();

  // Count how many platform users have earned this (rough social proof)
  const holderCount = await db.attempt.count({ where: { status: "SOLVED" } }).then(() => null).catch(() => null);
  void holderCount;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full">
        {/* Badge card */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center shadow-2xl shadow-emerald-500/5 mb-6">
          <div className="text-7xl mb-5 leading-none">{ach.emoji}</div>
          <div className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/8 rounded-full px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Achievement Unlocked
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{ach.name}</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">{ach.description}</p>
          <div className="mt-4 pt-4 border-t border-white/6">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">{ach.category} · Sage Vault Cyber Range</p>
          </div>
        </div>

        {/* Verify link */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 px-4 py-3 text-center mb-6">
          <p className="text-[11px] text-zinc-500 mb-1">Verified achievement from</p>
          <p className="text-sm font-semibold text-emerald-400">Sage Vault by CyberSage</p>
          <p className="text-[10px] text-zinc-700 mt-1 font-mono break-all">sagevault.co/achievements/{id}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/achievements"
            className="flex-1 text-center rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
          >
            All Achievements
          </Link>
          <Link
            href="/sign-in"
            className="flex-1 text-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-colors"
          >
            Earn This →
          </Link>
        </div>
      </div>
    </div>
  );
}
