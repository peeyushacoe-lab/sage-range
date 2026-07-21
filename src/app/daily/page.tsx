import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Countdown } from "./_components/countdown";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily Challenge · Sage Vault" };

const DIFF_COLOR: Record<string, string> = {
  EASY:   "text-emerald-400 border-emerald-500/30 bg-emerald-500/8",
  MEDIUM: "text-amber-400  border-amber-500/30  bg-amber-500/8",
  HARD:   "text-red-400    border-red-500/30    bg-red-500/8",
  INSANE: "text-purple-400 border-purple-500/30 bg-purple-500/8",
};

const TYPE_LABEL: Record<string, string> = {
  CTF:       "CTF",
  BLUE_TEAM: "Blue Team",
  RED_TEAM:  "Red Team",
};

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function DailyChallengePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  // All published labs, stable order (created desc gives some variety)
  const labs = await db.lab.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, title: true, type: true, difficulty: true, category: true, points: true, description: true },
  });

  if (labs.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-zinc-500">No labs available yet.</p>
        </main>
      </div>
    );
  }

  // Deterministic daily selection — UTC day index seeds the pick
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const todayLab  = labs[dayIndex % labs.length];
  // Tomorrow's preview (title only, no spoilers on type/diff)
  const tomorrowLab = labs[(dayIndex + 1) % labs.length];

  const todayStart = startOfTodayUTC();

  const [myAttempt, todaySolves, allTimeStats] = await Promise.all([
    // Did the current user already solve this?
    db.attempt.findFirst({
      where: { userId: me.id, labId: todayLab.id, status: "SOLVED" },
      select: { solvedAt: true, timeTakenSec: true },
    }),
    // Everyone who solved it today, in order
    db.attempt.findMany({
      where: { labId: todayLab.id, status: "SOLVED", solvedAt: { gte: todayStart } },
      include: { user: { select: { id: true, displayName: true, email: true, skillScore: true } } },
      orderBy: { solvedAt: "asc" },
      take: 30,
    }),
    // All-time solve stats for this lab
    db.attempt.aggregate({
      where: { labId: todayLab.id },
      _count: { _all: true },
    }),
  ]);

  const totalAttempts = allTimeStats._count._all;
  const totalSolved = await db.attempt.count({ where: { labId: todayLab.id, status: "SOLVED" } });
  const solveRate = totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0;

  const myPosition = myAttempt
    ? todaySolves.findIndex((s) => s.user.id === me.id) + 1
    : null;

  function fmtTime(sec: number | null): string {
    if (!sec) return "—";
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60), s = sec % 60;
    return m < 60 ? `${m}m ${s}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  const diffStyle = DIFF_COLOR[todayLab.difficulty] ?? DIFF_COLOR.EASY;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-2xl font-bold">Daily Challenge</h1>
          </div>
          <Countdown />
        </div>

        {/* Today's lab card */}
        <div className={`rounded-2xl border p-6 space-y-4 ${myAttempt ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-zinc-900/60"}`}>

          {/* Solved badge */}
          {myAttempt && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-lg">✓</span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Solved Today</span>
              {myPosition && myPosition <= 3 && (
                <span className="text-xs text-zinc-500">
                  — {myPosition === 1 ? "🥇 First blood!" : myPosition === 2 ? "🥈 Second!" : "🥉 Third!"}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-zinc-100 leading-tight">{todayLab.title}</h2>
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{todayLab.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-xs font-bold px-2 py-1 rounded-md border ${diffStyle}`}>
                {todayLab.difficulty}
              </span>
              <span className="text-xs text-zinc-500">{TYPE_LABEL[todayLab.type]}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
            <span>{todayLab.category}</span>
            <span className="text-emerald-400 font-bold">+{todayLab.points} pts</span>
            <span>{solveRate}% solve rate all time</span>
            <span className="ml-auto text-zinc-400">{todaySolves.length} solved today</span>
          </div>

          <Link
            href={`/labs/${todayLab.slug}`}
            className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
              myAttempt
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-emerald-500 text-black hover:bg-emerald-400"
            }`}
          >
            {myAttempt ? "View Lab →" : "Start Challenge →"}
          </Link>
        </div>

        {/* My result (if solved) */}
        {myAttempt && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Your Time",     value: fmtTime(myAttempt.timeTakenSec) },
              { label: "Today Rank",    value: myPosition ? `#${myPosition}` : "—" },
              { label: "Today Solvers", value: todaySolves.length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{s.label}</p>
                <p className="text-2xl font-black tabular-nums text-zinc-100">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Today's solvers */}
        {todaySolves.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Today&apos;s Solvers</p>
              <p className="text-xs text-zinc-600">{todaySolves.length} so far</p>
            </div>
            <div className="divide-y divide-white/5">
              {todaySolves.map((s, i) => {
                const isMe = s.user.id === me.id;
                return (
                  <div key={s.id} className={`flex items-center justify-between px-5 py-3 ${isMe ? "bg-emerald-500/5" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 text-xs w-5 text-right">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </span>
                      <Link href={`/profile/${s.user.id}`} className={`text-sm font-medium hover:text-emerald-400 transition-colors ${isMe ? "text-emerald-300" : "text-zinc-200"}`}>
                        {s.user.displayName ?? s.user.email.split("@")[0]}
                        {isMe && <span className="ml-1.5 text-[10px] text-zinc-500">(you)</span>}
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {s.timeTakenSec && <span>{fmtTime(s.timeTakenSec)}</span>}
                      <span>{s.solvedAt?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tomorrow's teaser */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">Tomorrow</p>
            <p className="text-sm text-zinc-500">
              <span className="text-zinc-400 font-medium">{tomorrowLab.title}</span>
              {" "}— <span className="text-zinc-600">{tomorrowLab.category}</span>
            </p>
          </div>
          <span className="text-zinc-700 text-xs">🔒</span>
        </div>

      </main>
    </div>
  );
}
