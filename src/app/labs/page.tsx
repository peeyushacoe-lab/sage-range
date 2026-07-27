import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "./[slug]/_content";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requestCertificateApproval } from "@/lib/certificate-approval";

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
  const solvedCount = attempts.filter((a) => a.status === "SOLVED").length;
  const inProgressCount = attempts.filter((a) => a.status === "IN_PROGRESS").length;
  const completionPct = labs.length > 0 ? Math.round((solvedCount / labs.length) * 100) : 0;

  const completedByLab = new Map<string, Set<string>>();
  for (const r of labResponses) {
    if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
    completedByLab.get(r.labId)!.add(r.stage);
  }

  // Whole-platform completion (independent of the current type filter) gates
  // the "All Labs" certificate — the hardest certificate on the platform.
  const totalPublishedLabs = await db.lab.count({ where: { published: true } });
  const totalSolvedLabs = await db.attempt.count({
    where: { userId: user.id, status: "SOLVED", lab: { published: true } },
  });
  const allLabsComplete = totalPublishedLabs > 0 && totalSolvedLabs >= totalPublishedLabs;
  if (allLabsComplete) {
    await requestCertificateApproval(user.id, "LABS", "", "All Labs Completed");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Labs"
          subtitle="Hands-on challenges across CTF, Blue Team, and Red Team disciplines — from log analysis and detection engineering to AI security, DFIR, and cloud misconfigurations. Complete all tasks in a room to capture the flag."
          actions={
            <Link
              href="/labs/graph"
              className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
            >
              Skill Graph →
            </Link>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Labs" value={labs.length} sub={filter === "ALL" ? "all categories" : filter.replace("_", " ").toLowerCase()} />
          <StatCard label="Solved" value={solvedCount} sub={`${completionPct}% complete`} />
          <StatCard label="In Progress" value={inProgressCount} sub="attempts started" />
          <StatCard label="Remaining" value={Math.max(0, labs.length - solvedCount)} sub="left to solve" />
        </div>

        {allLabsComplete && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 mb-1">Every Lab Completed</p>
              <p className="font-semibold">You've solved every published lab on Sage Vault.</p>
              <p className="text-sm text-zinc-400 mt-1">Your certificate is ready to claim — pending admin approval.</p>
            </div>
            <a
              href="/labs/certificate"
              className="shrink-0 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition whitespace-nowrap"
            >
              View Certificate →
            </a>
          </div>
        )}

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
            const params = new URLSearchParams();
            if (t.key !== "ALL") params.set("type", t.key);
            const qs = params.toString();
            return (
              <Link
                key={t.key}
                href={qs ? `/labs?${qs}` : "/labs"}
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
          <EmptyState
            icon="🧪"
            title="No labs match this filter"
            description="Try a different category or difficulty — or jump into a guided path to build up from the fundamentals."
            action={{ label: "Explore Learning Paths", href: "/paths" }}
          />
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
