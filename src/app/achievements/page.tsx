import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { computeAchievements } from "@/lib/insights/achievements";
import { AchievementsGrid } from "@/components/insights/achievements-grid";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Achievements · Sage Vault" };

export default async function AchievementsPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const { achievements, earned, earnPct } = await computeAchievements(me.id);

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Your Achievements</p>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-sm text-ink-3 mt-1">{earned.length} / {achievements.length} unlocked</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums">{earnPct}%</p>
            <p className="text-xs text-ink-3 mt-0.5">completion</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${earnPct}%` }} />
        </div>

        {/* Achievements by category */}
        <AchievementsGrid achievements={achievements} />

      </main>
    </div>
  );
}
