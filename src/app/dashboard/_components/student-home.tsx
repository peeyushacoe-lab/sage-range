import Link from "next/link";
import { db } from "@/lib/db";
import { CertProgressCard } from "./cert-progress-card";
import { JoinClassroomClient } from "@/app/classroom/_components/classroom-hub-client";
import { buildHomeDashboard, type ContinueLearning } from "@/lib/insights/home-dashboard";
import type { AppUser } from "@/lib/current-user";

const GREETING_LABEL: Record<string, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

const DIFF_COLOR: Record<string, string> = {
  EASY: "text-emerald-400 border-emerald-500/30 bg-emerald-500/8",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-500/8",
  HARD: "text-red-400 border-red-500/30 bg-red-500/8",
  INSANE: "text-purple-400 border-purple-500/30 bg-purple-500/8",
};

const QUICK_ACCESS = [
  { href: "/academy", label: "Learning", icon: "📚" },
  { href: "/labs", label: "Labs", icon: "🧪" },
  { href: "/simulation/new", label: "Simulations", icon: "🎯" },
  { href: "/competitions", label: "Challenges", icon: "🏆" },
  { href: "/stats", label: "Progress", icon: "📊" },
  { href: "/transcript", label: "Certificates", icon: "🏅" },
  { href: "/scoreboard", label: "Ranking", icon: "📈" },
  { href: "/feed", label: "Community", icon: "👥" },
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
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">

      {/* ── Welcome Command Area ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-6 animate-fade-down">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Command Center</p>
            <h1 className="text-2xl font-bold text-zinc-100">
              {GREETING_LABEL[dashboard.greeting]}, {dashboard.displayName}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="rounded-full border px-3 py-0.5 text-xs font-bold tracking-widest uppercase"
                style={{ color: dashboard.rankColor, borderColor: `${dashboard.rankColor}66`, background: `${dashboard.rankColor}1a` }}
              >
                {dashboard.rankLabel}
              </span>
              {dashboard.globalRank && (
                <span className="text-xs text-zinc-500 font-mono">Rank #{dashboard.globalRank}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-2xl font-black text-amber-400 tabular-nums">{dashboard.streak}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{dashboard.streak === 1 ? "Day streak" : "Day streak"}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-100 tabular-nums">{dashboard.xp.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-400 tabular-nums">{dashboard.skillScore}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Skill score</p>
            </div>
          </div>
        </div>

        {dashboard.rankNextLabel && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
              <span>{dashboard.rankPct}% to {dashboard.rankNextLabel}</span>
            </div>
            <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${dashboard.rankPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Continue Where You Left ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Continue where you left</h2>
        {dashboard.continueLearning ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-emerald-500 uppercase tracking-widest font-mono mb-1">{dashboard.continueLearning.kind.replace("_", " ")}</p>
              <p className="text-lg font-bold text-zinc-100">{dashboard.continueLearning.title}</p>
              <p className="text-sm text-zinc-400 mt-1">{dashboard.continueLearning.sub}</p>
              {dashboard.continueLearning.kind === "lab" && (
                <div className="mt-3 w-56 space-y-1">
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${dashboard.continueLearning.progressPct}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-600 font-mono">{dashboard.continueLearning.progressPct}% complete</p>
                </div>
              )}
            </div>
            <Link
              href={continueLearningHref(dashboard.continueLearning)}
              className="shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
            >
              Resume →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-300">Nothing in progress — pick a lab or launch a simulation to get started.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/labs" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition">Browse labs →</Link>
              <Link href="/simulation/new" className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-white/25 transition">Launch a sim →</Link>
            </div>
          </div>
        )}
      </section>

      {/* ── Today's Mission ──────────────────────────────────────────── */}
      {dashboard.todaysMission && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Today&apos;s mission</h2>
          <div className={`rounded-xl border p-5 flex flex-wrap items-center justify-between gap-4 ${dashboard.todaysMission.solved ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/8 bg-zinc-900/50"}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Investigate</p>
                {dashboard.todaysMission.solved && <span className="text-xs text-emerald-400 font-semibold">✓ Solved today</span>}
              </div>
              <p className="text-lg font-bold text-zinc-100">{dashboard.todaysMission.title}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className={`px-2 py-0.5 rounded border font-mono ${DIFF_COLOR[dashboard.todaysMission.difficulty] ?? DIFF_COLOR.EASY}`}>{dashboard.todaysMission.difficulty}</span>
                <span className="text-emerald-400 font-bold">+{dashboard.todaysMission.points} pts</span>
              </div>
            </div>
            <Link href={`/labs/${dashboard.todaysMission.slug}`} className="shrink-0 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition">
              {dashboard.todaysMission.solved ? "View →" : "Start challenge →"}
            </Link>
          </div>
        </section>
      )}

      {/* ── Learning Journey ─────────────────────────────────────────── */}
      {dashboard.journey.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">My learning journey</h2>
            <Link href="/paths" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">View paths →</Link>
          </div>
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 space-y-3">
            {dashboard.journey.map((step, i) => (
              <Link
                key={step.title + i}
                href={step.href ?? "#"}
                className={`flex items-center gap-3 ${step.href ? "" : "pointer-events-none"}`}
              >
                <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                  step.status === "done" ? "bg-emerald-500 text-zinc-950" : step.status === "current" ? "border-2 border-amber-400 text-amber-400 animate-pulse" : "border border-zinc-700 text-zinc-700"
                }`}>
                  {step.status === "done" ? "✓" : step.status === "current" ? "🔥" : "🔒"}
                </span>
                <span className={`text-sm ${step.status === "done" ? "text-emerald-400" : step.status === "current" ? "text-amber-400 font-semibold" : "text-zinc-600"}`}>
                  {step.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Access Grid ────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Quick access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACCESS.map((q) => (
            <Link key={q.href} href={q.href} className="card-hover rounded-xl border border-white/8 bg-zinc-900/60 p-4 flex flex-col items-center gap-2 text-center hover:border-emerald-500/30 transition">
              <span className="text-2xl">{q.icon}</span>
              <span className="text-xs font-semibold text-zinc-300">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <CertProgressCard />

      {/* ── Active Labs ───────────────────────────────────────────────── */}
      {dashboard.activeLabs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Active labs</h2>
          <div className="rounded-xl border border-white/8 divide-y divide-white/5 overflow-hidden">
            {dashboard.activeLabs.map((lab) => (
              <Link key={lab.slug} href={`/labs/${lab.slug}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition">
                <p className="text-sm font-medium text-zinc-200">{lab.title}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-28 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${lab.progressPct}%` }} />
                  </div>
                  <span className="text-xs text-zinc-500 font-mono w-10 text-right">{lab.progressPct}%</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── My Classes ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">My classes</h2>
          {enrolledClasses.length > 0 && (
            <Link href="/classroom" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">View all →</Link>
          )}
        </div>
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Join a class</p>
            <JoinClassroomClient />
          </div>
          {enrolledClasses.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-white/5">
              {enrolledClasses.map(({ classroom }) => (
                <Link
                  key={classroom.id}
                  href={`/classroom/${classroom.id}`}
                  className="rounded-lg border border-white/8 bg-zinc-950 p-4 hover:border-emerald-500/40 hover:bg-white/3 transition"
                >
                  <p className="font-semibold text-zinc-100">{classroom.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{classroom._count.assignments} lab{classroom._count.assignments !== 1 ? "s" : ""} assigned</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 pt-3 border-t border-white/5">
              Not enrolled in any classes yet — enter a join code from your instructor above.
            </p>
          )}
        </div>
      </section>

      {/* ── Achievements + Leaderboard ───────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Achievements</h2>
            <Link href="/achievements" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
              {dashboard.achievementsEarnedCount}/{dashboard.achievementsTotalCount} →
            </Link>
          </div>
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 grid grid-cols-2 gap-3">
            {dashboard.achievementsPreview.map((a) => (
              <div key={a.id} className={`rounded-lg border p-3 flex items-center gap-2.5 ${a.earnedAt ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/8 opacity-50"}`}>
                <span className="text-xl">{a.emoji}</span>
                <p className="text-xs font-semibold text-zinc-200 leading-tight">{a.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Vault ranking</h2>
            <Link href="/scoreboard" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">View full leaderboard →</Link>
          </div>
          <div className="rounded-xl border border-white/8 divide-y divide-white/5 overflow-hidden">
            {dashboard.leaderboardPreview.length === 0 ? (
              <p className="text-xs text-zinc-600 p-5">Solve a lab to appear on the leaderboard.</p>
            ) : (
              dashboard.leaderboardPreview.map((row) => (
                <div key={row.id} className={`flex items-center justify-between px-4 py-3 ${row.isMe ? "bg-emerald-500/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 w-5 text-right font-mono">
                      {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
                    </span>
                    <span className={`text-sm ${row.isMe ? "text-emerald-300 font-semibold" : "text-zinc-300"}`}>
                      {row.name}{row.isMe && <span className="ml-1.5 text-[10px] text-zinc-500">(you)</span>}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono tabular-nums">{row.skillScore}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Announcements ─────────────────────────────────────────────── */}
      {dashboard.announcements.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Latest updates</h2>
          <div className="rounded-xl border border-white/8 divide-y divide-white/5 overflow-hidden">
            {dashboard.announcements.map((a) => {
              const content = (
                <div className="px-5 py-4">
                  <p className="text-sm font-semibold text-zinc-100">{a.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">{a.body}</p>
                  <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">{a.createdAt.toISOString().slice(0, 10)}</p>
                </div>
              );
              return a.href
                ? <Link key={a.id} href={a.href} className="block hover:bg-white/3 transition">{content}</Link>
                : <div key={a.id}>{content}</div>;
            })}
          </div>
        </section>
      )}
    </main>
  );
}
