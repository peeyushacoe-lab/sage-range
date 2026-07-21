import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "./[slug]/_content";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const TYPES = [
  { key: "ALL",       label: "All" },
  { key: "CTF",       label: "CTF" },
  { key: "BLUE_TEAM", label: "Blue Team" },
  { key: "RED_TEAM",  label: "Red Team" },
] as const;

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-sage-500",
  MEDIUM: "text-amber-400",
  HARD:   "text-orange-400",
  INSANE: "text-red-400",
};

export default async function LabsIndex({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const filter = TYPES.find((t) => t.key === type)?.key ?? "ALL";

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const labs = await db.lab.findMany({
    where: {
      published: true,
      ...(filter !== "ALL" ? { type: filter } : {}),
    },
    orderBy: [{ difficulty: "asc" }, { points: "asc" }],
  });

  const [attempts, labResponses] = await Promise.all([
    db.attempt.findMany({
      where: { userId: user.id, labId: { in: labs.map((l) => l.id) } },
    }),
    db.labResponse.findMany({
      where: { userId: user.id, labId: { in: labs.map((l) => l.id) } },
      select: { labId: true, stage: true },
    }),
  ]);

  const statusByLab = new Map(attempts.map((a) => [a.labId, a.status]));

  const completedByLab = new Map<string, Set<string>>();
  for (const r of labResponses) {
    if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
    completedByLab.get(r.labId)!.add(r.stage);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Labs</h1>
            <p className="text-zinc-400 mt-2">
              Hands-on challenges across CTF, Blue Team, and Red Team disciplines. Complete all tasks in a room to capture the flag.
            </p>
          </div>
          <Link
            href="/labs/graph"
            className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
          >
            Skill Graph →
          </Link>
        </header>

        {/* Simulation callout */}
        <div className="mb-8 rounded-xl border border-sage-500/30 bg-sage-500/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-sage-500 mb-1">Live Simulation Mode</p>
            <p className="font-semibold">Ready for a real incident?</p>
            <p className="text-sm text-zinc-400 mt-1">
              Simulations put you inside a live organization under attack. AI generates the company, employees, and attacker behavior.
              Your decisions are scored A–F and visible to recruiters.
            </p>
          </div>
          <Link
            href="/simulation/new"
            className="shrink-0 rounded-lg bg-sage-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition whitespace-nowrap"
          >
            Launch Simulation →
          </Link>
        </div>

        {/* Type filter */}
        <nav className="flex gap-2 mb-6">
          {TYPES.map((t) => {
            const active = t.key === filter;
            return (
              <Link
                key={t.key}
                href={t.key === "ALL" ? "/labs" : `/labs?type=${t.key}`}
                className={
                  active
                    ? "rounded-full bg-sage-500 px-4 py-1.5 text-sm font-medium text-black"
                    : "rounded-full border border-white/10 px-4 py-1.5 text-sm text-zinc-400 hover:text-white hover:border-white/30"
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {labs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No labs match this filter.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labs.map((lab, idx) => {
              const status = statusByLab.get(lab.id);
              const solved = status === "SOLVED";
              const inProgress = status === "IN_PROGRESS";
              const taskStages = TASK_STAGES[lab.slug] ?? [];
              const taskCount = taskStages.length;
              const doneCount = taskStages.filter((s) => completedByLab.get(lab.id)?.has(s)).length;

              return (
                <Link
                  key={lab.id}
                  href={`/labs/${lab.slug}`}
                  className={`card-hover rounded-xl border p-5 flex flex-col gap-3 relative overflow-hidden animate-fade-up ${
                    solved
                      ? "border-sage-500/40 bg-sage-500/5"
                      : "border-white/8 bg-zinc-900/60"
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Solved corner accent */}
                  {solved && <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/15 rounded-full blur-xl" />}

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-sage-500 font-mono">
                      {lab.type.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-bold font-mono ${DIFF_COLORS[lab.difficulty] ?? "text-zinc-400"}`}>
                      {lab.difficulty}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold flex items-center gap-2 leading-snug">
                      {lab.title}
                      {solved && <span className="text-sage-500">✓</span>}
                      {inProgress && <span className="text-amber-400 text-xs font-mono">IN PROGRESS</span>}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">{lab.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                      <span>{lab.category}</span>
                      {taskCount > 0 && (
                        <>
                          <span>·</span>
                          <span className={solved ? "text-sage-500" : inProgress ? "text-amber-400" : ""}>
                            {doneCount > 0 && !solved ? `${doneCount}/${taskCount}` : `${taskCount}`} tasks
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-400 font-mono">{lab.points} pts</span>
                  </div>

                  {taskCount > 0 && doneCount > 0 && (
                    <div className="flex gap-1">
                      {taskStages.map((stage) => (
                        <div
                          key={stage}
                          className={`flex-1 h-0.5 rounded-full transition-all ${
                            completedByLab.get(lab.id)?.has(stage)
                              ? "bg-sage-500"
                              : "bg-zinc-800"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
