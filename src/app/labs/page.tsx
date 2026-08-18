import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "./[slug]/_content";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader, StatCard, Card, Badge, buttonVariants } from "@/components/ui";
import { requestCertificateApproval } from "@/lib/certificate-approval";
import { Icon, type IconName } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

const TYPES = [
  { key: "ALL",       label: "All" },
  { key: "CTF",       label: "CTF" },
  { key: "BLUE_TEAM", label: "Blue Team" },
  { key: "RED_TEAM",  label: "Red Team" },
] as const;

const DIFF_TONE: Record<string, "emerald" | "amber" | "red" | "purple"> = {
  EASY: "emerald",
  MEDIUM: "amber",
  HARD: "red",
  INSANE: "purple",
};

const TYPE_META: Record<string, { icon: IconName; tint: string }> = {
  CTF:       { icon: "challenges", tint: "text-sage-500 bg-sage-500/10" },
  BLUE_TEAM: { icon: "blueTeam",   tint: "text-blue-300 bg-blue-500/10" },
  RED_TEAM:  { icon: "redTeam",    tint: "text-red-300 bg-red-500/10" },
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

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Labs"
          subtitle="Hands-on challenges across CTF, Blue Team, and Red Team disciplines — from log analysis and detection engineering to AI security, DFIR, and cloud misconfigurations. Complete all tasks in a room to capture the flag."
          actions={
            <Link href="/labs/graph" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Skill Graph →
            </Link>
          }
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Labs" value={labs.length} sub={filter === "ALL" ? "all categories" : filter.replace("_", " ").toLowerCase()} />
          <StatCard label="Solved" value={solvedCount} sub={`${completionPct}% complete`} />
          <StatCard label="In Progress" value={inProgressCount} sub="attempts started" />
          <StatCard label="Remaining" value={Math.max(0, labs.length - solvedCount)} sub="left to solve" />
        </div>

        {allLabsComplete && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/[0.06] p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 sm:flex">
                  <Icon name="trophy" size={19} />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400">Every lab completed</p>
                  <p className="font-semibold">You&apos;ve solved every published lab on Sage Vault.</p>
                  <p className="mt-0.5 text-sm text-zinc-400">Your certificate is ready to claim — pending admin approval.</p>
                </div>
              </div>
              <a href="/labs/certificate" className="shrink-0 whitespace-nowrap rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400">
                View Certificate →
              </a>
            </div>
          </Card>
        )}

        {/* Simulation callout */}
        <Card className="mb-8 border-sage-500/30 bg-sage-500/[0.06] p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-500/15 text-sage-500 sm:flex">
                <Icon name="simulations" size={19} />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-sage-500">Live simulation mode</p>
                <p className="font-semibold">Ready for a real incident?</p>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                  Simulations put you inside a live organization under attack. AI generates the company, employees, and attacker behavior.
                  Your decisions are scored A–F and visible to recruiters.
                </p>
              </div>
            </div>
            <Link href="/simulation/new" className="shrink-0 whitespace-nowrap rounded-xl bg-sage-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-sage-700 hover:text-white">
              Launch Simulation →
            </Link>
          </div>
        </Card>

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
                className={
                  active
                    ? "rounded-full bg-sage-500 px-4 py-1.5 text-sm font-medium text-black"
                    : "rounded-full border border-white/10 px-4 py-1.5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
                }
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
            {labs.map((lab) => {
              const status = statusByLab.get(lab.id);
              const solved = status === "SOLVED";
              const inProgress = status === "IN_PROGRESS";
              const taskStages = TASK_STAGES[lab.slug] ?? [];
              const taskCount = taskStages.length;
              const doneCount = taskStages.filter((s) => completedByLab.get(lab.id)?.has(s)).length;
              const meta = TYPE_META[lab.type] ?? { icon: "labs" as IconName, tint: "text-zinc-300 bg-zinc-700/30" };

              return (
                <Link key={lab.id} href={`/labs/${lab.slug}`} className="group block">
                  <Card
                    interactive
                    className={`relative flex h-full flex-col gap-3 overflow-hidden p-5 ${solved ? "border-sage-500/40 bg-sage-500/[0.06]" : ""}`}
                  >
                    {solved && <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sage-500/15 blur-xl" />}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
                          <Icon name={meta.icon} size={15} />
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                          {lab.type.replace("_", " ")}
                        </span>
                      </div>
                      <Badge tone={DIFF_TONE[lab.difficulty] ?? "zinc"}>{lab.difficulty}</Badge>
                    </div>

                    <div>
                      <h3 className="flex items-center gap-2 font-semibold leading-snug text-zinc-100 transition group-hover:text-white">
                        <span className="min-w-0 truncate">{lab.title}</span>
                        {solved && <Icon name="check" size={14} className="shrink-0 text-sage-500" />}
                        {inProgress && <span className="shrink-0 font-mono text-[10px] text-amber-400">IN PROGRESS</span>}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500">{lab.description}</p>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600">
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
                      <span className="font-mono text-xs font-bold text-zinc-400">{lab.points} pts</span>
                    </div>

                    {taskCount > 0 && doneCount > 0 && (
                      <div className="flex gap-1">
                        {taskStages.map((stage) => (
                          <div
                            key={stage}
                            className={`h-0.5 flex-1 rounded-full transition-all ${
                              completedByLab.get(lab.id)?.has(stage) ? "bg-sage-500" : "bg-zinc-800"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
