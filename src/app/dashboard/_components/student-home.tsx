import Link from "next/link";
import { db } from "@/lib/db";
import { CertProgressCard } from "./cert-progress-card";
import { JoinClassroomClient } from "@/app/classroom/_components/classroom-hub-client";
import { buildHomeDashboard, type ContinueLearning } from "@/lib/insights/home-dashboard";
import type { AppUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import { Button, ProgressBar, Severity, toSeverity } from "@/components/ui";

import { Icon, type IconName } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
const GREETING_LABEL: Record<string, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

// Difficulty is genuinely ordered, same shape as severity, so it borrows the
// same ramp — EASY reads as "low risk to attempt", INSANE as "critical".
const DIFF_SEVERITY: Record<string, ReturnType<typeof toSeverity>> = {
  EASY: "low",
  MEDIUM: "medium",
  HARD: "high",
  INSANE: "critical",
};

const QUICK_ACCESS: { href: string; label: string; icon: IconName }[] = [
  { href: "/academy", label: "Learning", icon: "learning" },
  { href: "/labs", label: "Labs", icon: "labs" },
  { href: "/simulation/new", label: "Simulations", icon: "simulations" },
  { href: "/competitions", label: "Challenges", icon: "challenges" },
  { href: "/stats", label: "Progress", icon: "progress" },
  { href: "/transcript", label: "Certificates", icon: "certificates" },
  { href: "/scoreboard", label: "Ranking", icon: "leaderboard" },
  { href: "/feed", label: "Community", icon: "users" },
];

function continueLearningHref(cl: NonNullable<ContinueLearning>) {
  return cl.href;
}

export async function StudentHome({ user }: { user: AppUser }) {
  const [dashboard, enrolledClasses] = await Promise.all([
    buildHomeDashboard(user),
    db.classroomEnrollment.findMany({
      where: { userId: user.id },
      include: { classroom: { select: { id: true, name: true, _count: { select: { assignments: true } } } } },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">

      {/* ── Welcome Command Area ─────────────────────────────────────── */}
      <div className="animate-fade-down rounded-lg border border-edge bg-surface-1 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-ink-3">Command Center</p>
            <h1 className="text-2xl font-medium text-ink">
              {GREETING_LABEL[dashboard.greeting]}, {dashboard.displayName}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              {/* rankColor is data-driven (bronze/silver/gold-style tiers) — kept inline rather than tokenised */}
              <span
                className="rounded-sm border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]"
                style={{ color: dashboard.rankColor, borderColor: `${dashboard.rankColor}66`, background: `${dashboard.rankColor}1a` }}
              >
                {dashboard.rankLabel}
              </span>
              {dashboard.globalRank && (
                <span className="font-mono text-xs text-ink-3">Rank #{dashboard.globalRank}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-2xl font-medium tabular-nums text-warn">{dashboard.streak}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Day streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-medium tabular-nums text-ink">{dashboard.xp.toLocaleString()}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-medium tabular-nums text-ok">{dashboard.skillScore}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Skill score</p>
            </div>
          </div>
        </div>

        {dashboard.rankNextLabel && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-ink-3">
              <span>{dashboard.rankPct}% to {dashboard.rankNextLabel}</span>
            </div>
            <ProgressBar value={dashboard.rankPct} label={`Progress to ${dashboard.rankNextLabel}`} className="h-1" />
          </div>
        )}
      </div>

      {/* ── Continue Where You Left ──────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-2">Continue where you left</h2>
        {dashboard.continueLearning ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-accent-edge bg-accent-wash p-5">
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-accent">{dashboard.continueLearning.kind.replace("_", " ")}</p>
              <p className="text-lg font-medium text-ink">{dashboard.continueLearning.title}</p>
              <p className="mt-1 text-sm text-ink-2">{dashboard.continueLearning.sub}</p>
              {dashboard.continueLearning.kind === "lab" && (
                <div className="mt-3 w-56 space-y-1">
                  <ProgressBar value={dashboard.continueLearning.progressPct} label="Lab progress" className="h-1.5" />
                  <p className="font-mono text-[10px] text-ink-3">{dashboard.continueLearning.progressPct}% complete</p>
                </div>
              )}
            </div>
            <Link href={continueLearningHref(dashboard.continueLearning)}>
              <Button variant="primary">Resume →</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-edge bg-surface-1 p-5">
            <div>
              <p className="text-sm text-ink-2">Nothing in progress — pick a lab or launch a simulation to get started.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/labs"><Button variant="primary" size="sm">Browse labs →</Button></Link>
              <Link href="/simulation/new"><Button variant="secondary" size="sm">Launch a sim →</Button></Link>
            </div>
          </div>
        )}
      </section>

      {/* ── Today's Mission ──────────────────────────────────────────── */}
      {dashboard.todaysMission && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-2">Today&apos;s mission</h2>
          <div className={cn(
            "flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5",
            dashboard.todaysMission.solved ? "border-ok-edge bg-ok-wash" : "border-edge bg-surface-1"
          )}>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">Investigate</p>
                {dashboard.todaysMission.solved && (
                  <span className="flex items-center gap-1 text-xs font-medium text-ok">
                    <Icon name="check" size={14} className="inline-block shrink-0" /> Solved today
                  </span>
                )}
              </div>
              <p className="text-lg font-medium text-ink">{dashboard.todaysMission.title}</p>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <Severity level={DIFF_SEVERITY[dashboard.todaysMission.difficulty] ?? "low"}>
                  {dashboard.todaysMission.difficulty}
                </Severity>
                <span className="font-medium text-ok">+{dashboard.todaysMission.points} pts</span>
              </div>
            </div>
            <Link href={`/labs/${dashboard.todaysMission.slug}`}>
              <Button variant="primary">{dashboard.todaysMission.solved ? "View →" : "Start challenge →"}</Button>
            </Link>
          </div>
        </section>
      )}

      {/* ── Learning Journey ─────────────────────────────────────────── */}
      {dashboard.journey.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">My learning journey</h2>
            <Link href="/paths" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">View paths →</Link>
          </div>
          <div className="space-y-3 rounded-lg border border-edge bg-surface-1 p-5">
            {dashboard.journey.map((step, i) => (
              <Link
                key={step.title + i}
                href={step.href ?? "#"}
                className={cn("flex items-center gap-3", !step.href && "pointer-events-none")}
              >
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                  step.status === "done" ? "bg-ok text-surface-0"
                    : step.status === "current" ? "animate-pulse border-2 border-warn text-warn"
                    : "border border-edge-strong text-ink-3"
                )}>
                  {step.status === "done" ? <Icon name="check" size={13} /> : step.status === "current" ? <Icon name="streak" size={13} /> : <Icon name="lock" size={13} />}
                </span>
                <span className={cn(
                  "text-sm",
                  step.status === "done" ? "text-ok" : step.status === "current" ? "font-medium text-warn" : "text-ink-3"
                )}>
                  {step.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Access Grid ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-2">Quick access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACCESS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col items-center gap-2 rounded-lg border border-edge bg-surface-1 p-4 text-center transition-colors duration-fast hover:border-edge-strong hover:bg-surface-2"
            >
              <IconTile name={q.icon} size={44} />
              <span className="text-xs font-medium text-ink-2">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <CertProgressCard />

      {/* ── Active Labs ───────────────────────────────────────────────── */}
      {dashboard.activeLabs.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-2">Active labs</h2>
          <div className="divide-y divide-edge-subtle overflow-hidden rounded-lg border border-edge">
            {dashboard.activeLabs.map((lab) => (
              <Link key={lab.slug} href={`/labs/${lab.slug}`} className="flex items-center justify-between px-5 py-3.5 transition-colors duration-fast hover:bg-surface-2">
                <p className="text-sm font-medium text-ink-2">{lab.title}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <ProgressBar value={lab.progressPct} label={`${lab.title} progress`} className="h-1.5 w-28" />
                  <span className="w-10 text-right font-mono text-xs text-ink-3">{lab.progressPct}%</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── My Classes ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">My classes</h2>
          {enrolledClasses.length > 0 && (
            <Link href="/classroom" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">View all →</Link>
          )}
        </div>
        <div className="space-y-4 rounded-lg border border-edge bg-surface-1 p-5">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-ink-3">Join a class</p>
            <JoinClassroomClient />
          </div>
          {enrolledClasses.length > 0 ? (
            <div className="grid gap-3 border-t border-edge-subtle pt-3 sm:grid-cols-2">
              {enrolledClasses.map(({ classroom }) => (
                <Link
                  key={classroom.id}
                  href={`/classroom/${classroom.id}`}
                  className="rounded-md border border-edge bg-surface-inset p-4 transition-colors duration-fast hover:border-edge-strong hover:bg-surface-2"
                >
                  <p className="font-medium text-ink">{classroom.name}</p>
                  <p className="mt-1 text-xs text-ink-3">{classroom._count.assignments} lab{classroom._count.assignments !== 1 ? "s" : ""} assigned</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="border-t border-edge-subtle pt-3 text-xs text-ink-3">
              Not enrolled in any classes yet — enter a join code from your instructor above.
            </p>
          )}
        </div>
      </section>

      {/* ── Achievements + Leaderboard ───────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">Achievements</h2>
            <Link href="/achievements" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">
              {dashboard.achievementsEarnedCount}/{dashboard.achievementsTotalCount} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-edge bg-surface-1 p-5">
            {dashboard.achievementsPreview.map((a) => (
              <div key={a.id} className={cn(
                "flex items-center gap-2.5 rounded-md border p-3",
                a.earnedAt ? "border-ok-edge bg-ok-wash" : "border-edge opacity-50"
              )}>
                <Icon name={a.icon} size={20} />
                <p className="text-xs font-medium leading-tight text-ink-2">{a.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">Vault ranking</h2>
            <Link href="/scoreboard" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">View full leaderboard →</Link>
          </div>
          <div className="divide-y divide-edge-subtle overflow-hidden rounded-lg border border-edge">
            {dashboard.leaderboardPreview.length === 0 ? (
              <p className="p-5 text-xs text-ink-3">Solve a lab to appear on the leaderboard.</p>
            ) : (
              dashboard.leaderboardPreview.map((row) => (
                <div key={row.id} className={cn("flex items-center justify-between px-4 py-3", row.isMe && "bg-accent-wash")}>
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-right font-mono text-xs text-ink-3">
                      {row.rank <= 3 ? <Icon name="medal" size={15} tone={(["gold","slate","amber"] as const)[row.rank - 1]} /> : `#${row.rank}`}
                    </span>
                    <span className={cn("text-sm", row.isMe ? "font-medium text-accent" : "text-ink-2")}>
                      {row.name}{row.isMe && <span className="ml-1.5 text-[10px] text-ink-3">(you)</span>}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-ink-3">{row.skillScore}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Announcements ─────────────────────────────────────────────── */}
      {dashboard.announcements.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-2">Latest updates</h2>
          <div className="divide-y divide-edge-subtle overflow-hidden rounded-lg border border-edge">
            {dashboard.announcements.map((a) => {
              const content = (
                <div className="px-5 py-4">
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="mt-1 text-xs text-ink-3">{a.body}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-ink-3">{a.createdAt.toISOString().slice(0, 10)}</p>
                </div>
              );
              return a.href
                ? <Link key={a.id} href={a.href} className="block transition-colors duration-fast hover:bg-surface-2">{content}</Link>
                : <div key={a.id}>{content}</div>;
            })}
          </div>
        </section>
      )}
    </main>
  );
}
