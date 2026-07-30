import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Countdown } from "./_components/countdown";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "Daily Challenge · Sage Vault" };

const DIFF_COLOR: Record<string, string> = {
  EASY:   "text-ok border-ok-edge bg-ok-wash",
  MEDIUM: "text-warn  border-warn-edge bg-warn-wash",
  HARD:   "text-danger    border-danger-edge bg-danger-wash",
  INSANE: "text-accent border-accent-edge bg-accent-wash",
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
      <div className="min-h-screen bg-surface-0 text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-ink-3">No labs available yet.</p>
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
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-2xl font-bold">Daily Challenge</h1>
          </div>
          <Countdown />
        </div>

        {/* Today's lab card */}
        <div className={`rounded-2xl border p-6 space-y-4 ${myAttempt ? "border-ok-edge bg-ok-wash" : "border-edge bg-surface-1"}`}>

          {/* Solved badge */}
          {myAttempt && (
            <div className="flex items-center gap-2">
              <span className="text-ok text-lg"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
              <span className="text-xs font-bold text-ink-3 uppercase tracking-widest">Solved Today</span>
              {myPosition && myPosition <= 3 && (
                <span className="text-xs text-ink-3">
                  — {myPosition === 1 ? <><Icon name="medal" size={14} tone="gold" /> First blood!</> : myPosition === 2 ? <><Icon name="medal" size={14} tone="slate" /> Second!</> : <><Icon name="medal" size={14} tone="amber" /> Third!</>}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-ink leading-tight">{todayLab.title}</h2>
              <p className="text-sm text-ink-2 mt-1 line-clamp-2">{todayLab.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-xs font-bold px-2 py-1 rounded-md border ${diffStyle}`}>
                {todayLab.difficulty}
              </span>
              <span className="text-xs text-ink-3">{TYPE_LABEL[todayLab.type]}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-3 pt-1">
            <span>{todayLab.category}</span>
            <span className="text-ok font-bold">+{todayLab.points} pts</span>
            <span>{solveRate}% solve rate all time</span>
            <span className="ml-auto text-ink-2">{todaySolves.length} solved today</span>
          </div>

          <Link
            href={`/labs/${todayLab.slug}`}
            className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
              myAttempt
                ? "bg-ok-wash text-ok border border-ok-edge hover:bg-ok-wash"
                : "bg-accent-fill text-white hover:bg-accent-hover"
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
              <div key={s.label} className="rounded-xl border border-edge bg-surface-1 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">{s.label}</p>
                <p className="text-2xl font-black tabular-nums text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Today's solvers */}
        {todaySolves.length > 0 && (
          <div className="rounded-xl border border-edge bg-surface-1 overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-ink-3">Today&apos;s Solvers</p>
              <p className="text-xs text-ink-3">{todaySolves.length} so far</p>
            </div>
            <div className="divide-y divide-edge-subtle">
              {todaySolves.map((s, i) => {
                const isMe = s.user.id === me.id;
                return (
                  <div key={s.id} className={`flex items-center justify-between px-5 py-3 ${isMe ? "bg-ok-wash" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-ink-3 text-xs w-5 text-right">
                        {i < 3 ? <Icon name="medal" size={15} tone={(["gold","slate","amber"] as const)[i]} /> : i + 1}
                      </span>
                      <Link href={`/profile/${s.user.id}`} className={`text-sm font-medium hover:text-ok transition-colors ${isMe ? "text-ok" : "text-ink"}`}>
                        {s.user.displayName ?? s.user.email.split("@")[0]}
                        {isMe && <span className="ml-1.5 text-[10px] text-ink-3">(you)</span>}
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ink-3">
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
        <div className="rounded-xl border border-edge bg-surface-1 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-0.5">Tomorrow</p>
            <p className="text-sm text-ink-3">
              <span className="text-ink-2 font-medium">{tomorrowLab.title}</span>
              {" "}— <span className="text-ink-3">{tomorrowLab.category}</span>
            </p>
          </div>
          <Icon name="lock" size={13} className="text-ink-3" />
        </div>

      </main>
    </div>
  );
}
