import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "./[slug]/_content";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";
import { Badge, Button, EmptyState, PageHeader, Severity, StatCard, toSeverity } from "@/components/ui";
import { requestCertificateApproval } from "@/lib/certificate-approval";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

const TYPES = [
  { key: "ALL",       label: "All" },
  { key: "CTF",       label: "CTF" },
  { key: "BLUE_TEAM", label: "Blue Team" },
  { key: "RED_TEAM",  label: "Red Team" },
] as const;

// Difficulty is genuinely ordered, same shape as severity — EASY reads as
// "low risk to attempt", INSANE as "critical".
const DIFF_SEVERITY: Record<string, ReturnType<typeof toSeverity>> = {
  EASY: "low",
  MEDIUM: "medium",
  HARD: "high",
  INSANE: "critical",
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
    <main className="min-h-screen bg-surface-0 text-ink">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Labs"
          subtitle="Hands-on challenges across CTF, Blue Team, and Red Team disciplines — from log analysis and detection engineering to AI security, DFIR, and cloud misconfigurations. Complete all tasks in a room to capture the flag."
          actions={
            <Link href="/labs/graph"><Button variant="secondary">Skill Graph →</Button></Link>
          }
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Labs" value={labs.length} sub={filter === "ALL" ? "all categories" : filter.replace("_", " ").toLowerCase()} />
          <StatCard label="Solved" value={solvedCount} tone="ok" sub={`${completionPct}% complete`} />
          <StatCard label="In Progress" value={inProgressCount} tone="warn" sub="attempts started" />
          <StatCard label="Remaining" value={Math.max(0, labs.length - solvedCount)} sub="left to solve" />
        </div>

        {allLabsComplete && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-ok-edge bg-ok-wash p-5">
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-ok">Every Lab Completed</p>
              <p className="font-medium text-ink">You've solved every published lab on Sage Vault.</p>
              <p className="mt-1 text-sm text-ink-2">Your certificate is ready to claim — pending admin approval.</p>
            </div>
            <Link href="/labs/certificate" className="shrink-0">
              <Button variant="primary">View Certificate →</Button>
            </Link>
          </div>
        )}

        {/* Simulation callout — a promotional CTA, not a success state, so it stays on accent rather than ok */}
        <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-accent-edge bg-accent-wash p-5">
          <div>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-accent">Live Simulation Mode</p>
            <p className="font-medium text-ink">Ready for a real incident?</p>
            <p className="mt-1 text-sm text-ink-2">
              Simulations put you inside a live organization under attack. AI generates the company, employees, and attacker behavior.
              Your decisions are scored A–F and visible to recruiters.
            </p>
          </div>
          <Link href="/simulation/new" className="shrink-0">
            <Button variant="primary">Launch Simulation →</Button>
          </Link>
        </div>

        {/* Type filter */}
        <nav className="mb-6 flex gap-2">
          {TYPES.map((t) => {
            const active = t.key === filter;
            const params = new URLSearchParams();
            if (t.key !== "ALL") params.set("type", t.key);
            const qs = params.toString();
            return (
              <Link
                key={t.key}
                href={qs ? `/labs?${qs}` : "/labs"}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors duration-fast",
                  active
                    ? "bg-accent-fill font-medium text-white"
                    : "border border-edge-strong text-ink-2 hover:border-edge-strong hover:text-ink"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {labs.length === 0 ? (
          <EmptyState
            icon="labs"
            title="No labs match this filter"
            description="Try a different category or difficulty — or jump into a guided path to build up from the fundamentals."
            action={{ label: "Explore Learning Paths", href: "/paths" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  className={cn(
                    "animate-fade-up flex flex-col gap-3 rounded-lg border p-5 transition-colors duration-fast",
                    solved ? "border-ok-edge bg-ok-wash hover:border-ok" : "border-edge bg-surface-1 hover:border-edge-strong hover:bg-surface-2"
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
                      {lab.type.replace("_", " ")}
                    </span>
                    <Severity level={DIFF_SEVERITY[lab.difficulty] ?? "low"}>{lab.difficulty}</Severity>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-2 font-medium leading-snug text-ink">
                      {lab.title}
                      {solved && <span className="text-ok"><Icon name="check" size={14} className="inline-block shrink-0" /></span>}
                      {inProgress && <Badge tone="warn">In progress</Badge>}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-3">{lab.description}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 font-mono text-xs text-ink-3">
                      <span>{lab.category}</span>
                      {taskCount > 0 && (
                        <>
                          <span>·</span>
                          <span className={solved ? "text-ok" : inProgress ? "text-warn" : ""}>
                            {doneCount > 0 && !solved ? `${doneCount}/${taskCount}` : `${taskCount}`} tasks
                          </span>
                        </>
                      )}
                    </div>
                    <span className="font-mono text-xs font-medium text-ink-2">{lab.points} pts</span>
                  </div>

                  {taskCount > 0 && doneCount > 0 && (
                    <div className="flex gap-1">
                      {taskStages.map((stage) => (
                        <div
                          key={stage}
                          className={cn(
                            "h-0.5 flex-1 rounded-full transition-colors duration-slow",
                            completedByLab.get(lab.id)?.has(stage) ? "bg-ok" : "bg-surface-inset"
                          )}
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
