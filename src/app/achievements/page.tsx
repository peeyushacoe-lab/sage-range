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
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Your Achievements</p>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-sm text-zinc-500 mt-1">{earned.length} / {achievements.length} unlocked</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums">{earnPct}%</p>
            <p className="text-xs text-zinc-500 mt-0.5">completion</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${earnPct}%` }} />
        </div>

        {/* Achievements by category */}
        <AchievementsGrid achievements={achievements} />

      </main>
    </div>
  );
}
