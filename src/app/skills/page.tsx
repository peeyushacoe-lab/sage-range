import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { computeSkillRadar } from "@/lib/insights/skills";
import { SkillRadarChart, SkillBreakdownCards } from "@/components/insights/skill-radar-chart";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skill Radar · Sage Vault" };

export default async function SkillsPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const { skills, overallScore } = await computeSkillRadar(me.id);

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Skill Analysis</p>
            <h1 className="text-2xl font-bold">Skill Radar</h1>
            <p className="text-sm text-ink-3 mt-1">Your capability profile across 6 core dimensions</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums">{overallScore}</p>
            <p className="text-xs text-ink-3 mt-0.5">overall skill index</p>
          </div>
        </div>

        {/* Radar + breakdown side by side */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">

          {/* SVG Radar chart */}
          <div className="md:col-span-3 rounded-xl border border-edge bg-surface-1 p-4 flex justify-center">
            <SkillRadarChart skills={skills} />
          </div>

          {/* Skill breakdown cards */}
          <div className="md:col-span-2">
            <SkillBreakdownCards skills={skills} />
          </div>
        </div>

        {/* How scores are computed */}
        <div className="rounded-xl border border-edge bg-surface-1 p-5">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">How Scores Are Computed</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-ink-3">
            <p><span className="text-ok font-semibold">CTF Mastery</span> — difficulty-weighted CTF lab solves</p>
            <p><span className="text-info font-semibold">Blue Team</span> — defensive labs + threat containment rate</p>
            <p><span className="text-danger font-semibold">Red Team</span> — offensive lab solve progression</p>
            <p><span className="text-accent font-semibold">Simulation</span> — average score across completed scenarios</p>
            <p><span className="text-warn font-semibold">Speed</span> — percentage of labs solved under expected time</p>
            <p><span className="text-pink-400 font-semibold">Depth</span> — Hard and Insane difficulty achievements</p>
          </div>
        </div>

      </main>
    </div>
  );
}
