import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getRankInfo, RANK_BADGE_CLASS } from "@/lib/cyber-identity";
import { RankLegend } from "@/components/insights/rank-legend";
import { JoinOrganizationClient } from "./_components/join-organization-client";
import { Navbar } from "@/components/navbar";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "Organization · Sage Vault" };

function relativeTime(date: Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export default async function OrganizationPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mt-4 mb-2">Organization Access</h1>
          <p className="text-ink-3 text-sm mb-6">
            Enter the join code provided by your organization to unlock licensed access.
            If your email domain is already registered, you were joined automatically at signup.
          </p>
          <JoinOrganizationClient />
        </div>
      </main>
    );
  }

  const org = membership.organization;
  const isLead = membership.isLead;

  const planColor =
    org.plan === "ENTERPRISE" ? "text-accent"
    : org.plan === "PRO" ? "text-warn"
    : org.plan === "BASIC" ? "text-ok"
    : "text-ink-2";
  const expired = org.expiresAt && org.expiresAt < new Date();

  // ── Non-lead: simple confirmation ───────────────────────────────────────────
  if (!isLead) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mt-4 mb-8">
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className={`text-sm font-semibold mt-0.5 ${planColor}`}>{org.plan} Plan</p>
            {expired && <p className="text-xs text-danger mt-0.5">License expired</p>}
          </div>
          <div className="p-6 rounded-xl border border-edge text-center">
            <p className="text-ink-2 text-sm">
              You have licensed access through <strong className="text-white">{org.name}</strong>.
            </p>
            <Link href="/classroom" className="inline-block mt-4 text-sm text-ok hover:text-ok">
              Go to your classroom →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Lead: fetch everything in parallel ──────────────────────────────────────
  const members = await db.organizationMember.findMany({
    where: { organizationId: org.id, user: { hidden: false } },
    include: { user: { select: { id: true, displayName: true, email: true, skillScore: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const memberIds = members.map((m) => m.user.id);

  const [allAttempts, allSims, recentLabActivity, recentSimActivity, allSolvedFull] = await Promise.all([
    db.attempt.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, status: true, startedAt: true, solvedAt: true, score: true },
    }),
    db.simulationSession.findMany({
      where: { userId: { in: memberIds }, status: { in: ["CONTAINED", "BREACHED"] } },
      select: { userId: true, score: true, endedAt: true, startedAt: true },
    }),
    db.attempt.findMany({
      where: { userId: { in: memberIds }, status: "SOLVED" },
      include: {
        user: { select: { id: true, displayName: true } },
        lab: { select: { title: true, difficulty: true, type: true } },
      },
      orderBy: { solvedAt: "desc" },
      take: 15,
    }),
    db.simulationSession.findMany({
      where: { userId: { in: memberIds }, status: { in: ["CONTAINED", "BREACHED"] } },
      include: {
        user: { select: { id: true, displayName: true } },
        template: { select: { name: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 10,
    }),
    db.attempt.findMany({
      where: { userId: { in: memberIds }, status: "SOLVED" },
      include: { lab: { select: { type: true } } },
    }),
  ]);

  // ── Per-member aggregates ────────────────────────────────────────────────────
  const weekAgo = Date.now() - 7 * 86400000;

  const memberStats = members.map((m) => {
    const uid = m.user.id;
    const attempts = allAttempts.filter((a) => a.userId === uid);
    const sims = allSims.filter((s) => s.userId === uid);
    const solved = attempts.filter((a) => a.status === "SOLVED");

    const lastAttempt = attempts.reduce<Date | null>((max, a) => (!max || a.startedAt > max ? a.startedAt : max), null);
    const lastSimDate = sims.reduce<Date | null>((max, s) => {
      const d = s.endedAt ?? s.startedAt;
      return !max || d > max ? d : max;
    }, null);
    const lastActive = !lastAttempt ? lastSimDate : !lastSimDate ? lastAttempt : lastAttempt > lastSimDate ? lastAttempt : lastSimDate;

    const activityDates = [...attempts.map((a) => a.startedAt), ...sims.map((s) => s.startedAt)];
    const streak = calcStreak(activityDates);
    const activeThisWeek = activityDates.some((d) => d.getTime() > weekAgo);
    const avgSimScore = sims.length ? Math.round(sims.reduce((s, x) => s + (x.score ?? 0), 0) / sims.length) : null;
    const rank = getRankInfo(m.user.skillScore);

    return { member: m, labsSolved: solved.length, simsCompleted: sims.length, avgSimScore, lastActive, streak, activeThisWeek, rank };
  });

  const leaderboard = [...memberStats].sort((a, b) => b.member.user.skillScore - a.member.user.skillScore);

  // ── Overview cards ───────────────────────────────────────────────────────────
  const totalSolved = memberStats.reduce((s, m) => s + m.labsSolved, 0);
  const avgSkill = members.length ? Math.round(members.reduce((s, m) => s + m.user.skillScore, 0) / members.length) : 0;
  const activeCount = memberStats.filter((m) => m.activeThisWeek).length;
  const topMember = leaderboard[0];

  // ── Skill coverage ───────────────────────────────────────────────────────────
  const typeCount = { CTF: 0, BLUE_TEAM: 0, RED_TEAM: 0 } as Record<string, number>;
  allSolvedFull.forEach((a) => { typeCount[a.lab.type] = (typeCount[a.lab.type] ?? 0) + 1; });
  const maxType = Math.max(...Object.values(typeCount), 1);

  // ── Activity feed ────────────────────────────────────────────────────────────
  type FeedItem =
    | { kind: "lab"; id: string; userName: string; userId: string; labTitle: string; difficulty: string; at: Date }
    | { kind: "sim"; id: string; userName: string; userId: string; simName: string; score: number; status: string; at: Date };

  const feed: FeedItem[] = [
    ...recentLabActivity.map((a) => ({
      kind: "lab" as const, id: a.id,
      userName: a.user.displayName ?? a.user.id, userId: a.user.id,
      labTitle: a.lab.title, difficulty: a.lab.difficulty,
      at: a.solvedAt ?? a.startedAt,
    })),
    ...recentSimActivity.map((s) => ({
      kind: "sim" as const, id: s.id,
      userName: s.user.displayName ?? s.user.id, userId: s.user.id,
      simName: s.template.name, score: s.score ?? 0, status: s.status,
      at: s.endedAt ?? s.startedAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20);

  const diffColor = (d: string) =>
    d === "EASY" ? "text-ok border-ok-edge" :
    d === "MEDIUM" ? "text-warn border-warn-edge" :
    d === "HARD" ? "text-danger border-danger-edge" :
    "text-accent border-accent-edge";

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Team Lead Dashboard</p>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className={`text-sm font-semibold mt-0.5 ${planColor}`}>{org.plan} Plan</p>
            {expired && <p className="text-xs text-danger mt-0.5">License expired</p>}
          </div>
          <a
            href="/api/organization/export"
            className="text-xs px-3 py-1.5 rounded-lg bg-accent-fill text-white font-semibold hover:bg-ok-wash transition self-start"
          >
            Export CSV
          </a>
        </div>

        {/* Join code */}
        <section className="p-4 rounded-xl border border-edge bg-surface-1">
          <p className="text-xs text-ink-3 uppercase tracking-widest mb-2">Join Code</p>
          <div className="flex items-center gap-3">
            <code className="text-2xl font-bold font-mono tracking-widest text-white">{org.joinCode}</code>
            <p className="text-xs text-ink-3">Share with your team to give them access.</p>
          </div>
        </section>

        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Members", value: `${members.length} / ${org.seats}`, sub: "seats used" },
            { label: "Avg Skill Score", value: avgSkill, sub: getRankInfo(avgSkill).label },
            { label: "Labs Solved", value: totalSolved, sub: "across all members" },
            { label: "Active This Week", value: activeCount, sub: `of ${members.length} members` },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-edge bg-surface-1 p-4">
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-2">{c.label}</p>
              <p className="text-3xl font-black tabular-nums text-ink">{c.value}</p>
              <p className="text-xs text-ink-3 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        <RankLegend />

        {/* Leaderboard + Activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Leaderboard */}
          <section className="lg:col-span-3 rounded-xl border border-edge bg-surface-1 overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-ink-3">Team Leaderboard</p>
              <p className="text-xs text-ink-3">{members.length} members</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge text-ink-3 text-[10px] uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">#</th>
                    <th className="text-left px-4 py-2.5">Name</th>
                    <th className="text-right px-4 py-2.5">Score</th>
                    <th className="text-right px-4 py-2.5">Labs</th>
                    <th className="text-right px-4 py-2.5">Sims</th>
                    <th className="text-right px-4 py-2.5">Streak</th>
                    <th className="text-right px-4 py-2.5">Last Active</th>
                    <th className="text-right px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {leaderboard.map((m, i) => (
                    <tr key={m.member.id} className={`hover:bg-surface-2 ${i === 0 ? "bg-warn-wash" : ""}`}>
                      <td className="px-4 py-2.5 text-ink-3 text-xs w-8">
                        {i < 3 ? <Icon name="medal" size={15} tone={(["gold","slate","amber"] as const)[i]} /> : i + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${m.member.user.id}`} className="font-medium hover:text-ok transition-colors text-ink">
                            {m.member.user.displayName ?? "—"}
                          </Link>
                          {m.member.isLead && <span className="text-[10px] text-warn border border-warn-edge rounded px-1">Lead</span>}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${RANK_BADGE_CLASS[m.rank.tier]}`}>
                          {m.rank.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-ink">{m.member.user.skillScore}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{m.labsSolved}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{m.simsCompleted}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {m.streak > 0
                          ? <span className="text-ok font-bold text-xs">{m.streak}d</span>
                          : <span className="text-ink-3 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-ink-3">{relativeTime(m.lastActive)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/organization/member/${m.member.user.id}`}
                          className="text-xs text-ok hover:text-ok transition-colors"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Activity Feed */}
          <section className="lg:col-span-2 rounded-xl border border-edge bg-surface-1 overflow-hidden">
            <div className="px-5 py-4 border-b border-edge">
              <p className="text-xs uppercase tracking-widest text-ink-3">Recent Team Activity</p>
            </div>
            <div className="divide-y divide-edge-subtle max-h-[520px] overflow-y-auto">
              {feed.length === 0 && (
                <p className="px-5 py-8 text-xs text-ink-3 text-center">No activity yet</p>
              )}
              {feed.map((item) => (
                <div key={item.id} className="px-4 py-3 flex gap-3 items-start">
                  <span className={`mt-0.5 text-sm shrink-0 ${item.kind === "lab" ? "text-ok" : item.status === "CONTAINED" ? "text-info" : "text-danger"}`}>
                    {item.kind === "lab" ? <Icon name="check" size={13} /> : item.status === "CONTAINED" ? <Icon name="blueTeam" size={13} /> : <Icon name="alert" size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-2 truncate">
                      <Link href={`/profile/${item.userId}`} className="font-semibold hover:text-ok transition-colors">
                        {item.userName}
                      </Link>
                      {item.kind === "lab"
                        ? <> solved <span className="text-ink">{item.labTitle}</span></>
                        : <> completed <span className="text-ink">{item.simName}</span> ({item.score})</>
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.kind === "lab" && (
                        <span className={`text-[10px] font-bold border rounded px-1 ${diffColor(item.difficulty)}`}>
                          {item.difficulty}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-3">{relativeTime(item.at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Skill coverage */}
        <section className="rounded-xl border border-edge bg-surface-1 p-5">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Team Skill Coverage</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "CTF / Attack", key: "CTF", color: "bg-ok" },
              { label: "Blue Team / Defence", key: "BLUE_TEAM", color: "bg-info" },
              { label: "Red Team / Offense", key: "RED_TEAM", color: "bg-danger" },
            ].map((t) => {
              const count = typeCount[t.key] ?? 0;
              const pct = Math.round((count / maxType) * 100);
              return (
                <div key={t.key}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-ink-2">{t.label}</span>
                    <span className="text-ink font-bold tabular-nums">{count} solved</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${t.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-ink-3 mt-1">{pct}% of strongest category</p>
                </div>
              );
            })}
          </div>
          {topMember && (
            <p className="text-xs text-ink-3 mt-4 pt-4 border-t border-edge">
              Top performer:{" "}
              <Link href={`/profile/${topMember.member.user.id}`} className="text-ok hover:text-ok font-semibold">
                {topMember.member.user.displayName ?? topMember.member.user.email}
              </Link>
              {" "}· {topMember.member.user.skillScore} skill score · {topMember.labsSolved} labs solved
            </p>
          )}
        </section>

      </div>
    </main>
  );
}
