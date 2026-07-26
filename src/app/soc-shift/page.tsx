import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SocShiftIndex() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const shifts = await db.socShift.findMany({
    where: { published: true },
    include: { alerts: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  const bestByShift = new Map<string, { score: number; accuracyPct: number }>();
  const attempts = await db.socShiftAttempt.findMany({
    where: { userId: user.id, shiftId: { in: shifts.map((s) => s.id) }, completedAt: { not: null } },
    orderBy: { score: "desc" },
  });
  for (const a of attempts) {
    if (!bestByShift.has(a.shiftId)) bestByShift.set(a.shiftId, { score: a.score ?? 0, accuracyPct: a.accuracyPct ?? 0 });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="SOC Shift Mode"
          subtitle="A batch of alerts drops at once — mostly noise, a few real. Triage everything before the clock runs out. Competitive rounds (marked below) also carry a public leaderboard."
        />

        {shifts.length === 0 ? (
          <EmptyState icon="🚨" title="No shifts published yet" description="Check back soon for a new round of alerts to triage." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map((s) => {
              const best = bestByShift.get(s.id);
              return (
                <Link
                  key={s.id}
                  href={`/soc-shift/${s.slug}`}
                  className={`rounded-xl border p-5 flex flex-col gap-3 transition ${
                    best ? "border-sage-500/40 bg-sage-500/5" : "border-white/8 bg-zinc-900/60 hover:border-sage-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                      {s.alerts.length} alerts · {Math.round(s.timeLimitSec / 60)} min
                    </span>
                    {best && <span className="text-sage-500 text-xs font-bold">✓ {best.score} pts</span>}
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{s.briefing}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
