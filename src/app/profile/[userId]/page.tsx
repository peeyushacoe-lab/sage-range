import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { ProfileFormClient } from "./_components/profile-form-client";
import { AvatarUpload } from "./_components/avatar-upload";
import { computeBadges, TIER_STYLE } from "@/lib/badges";
import { CyberAvatar } from "@/components/cyber-avatar";
import { getRankInfo, computeRoleBadge, computeSkillEmblems } from "@/lib/cyber-identity";
import { EmptyState } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_STYLE = {
  EXCEPTIONAL: { card: "border-ok-edge bg-ok-wash",  text: "text-ok", bar: "bg-ok" },
  STRONG:      { card: "border-info-edge bg-info-wash",        text: "text-info",    bar: "bg-info" },
  ADEQUATE:    { card: "border-warn-edge bg-warn-wash",      text: "text-warn",   bar: "bg-warn" },
  DEVELOPING:  { card: "border-edge-strong bg-surface-1",             text: "text-ink-2",    bar: "bg-surface-3" },
} as const;

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  // Any logged-in user can view any profile

  const [target, simSessions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: {
        attempts: { include: { lab: { select: { title: true, type: true, slug: true, difficulty: true, category: true } } }, orderBy: { solvedAt: "desc" } },
        aiEvaluations: { orderBy: { createdAt: "desc" }, take: 3 },
        certification: true,
      },
    }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      include: { template: { select: { name: true, industry: true } } },
      orderBy: { score: "desc" },
      take: 10,
    }),
  ]);
  if (!target) notFound();

  const isOwnProfile = me.id === userId;
  const solved = target.attempts.filter((a) => a.status === "SOLVED");
  const bestSimScore = simSessions.length > 0 ? simSessions[0].score : null;
  const rank = getRankInfo(target.skillScore);
  const badges = computeBadges({ attempts: target.attempts, simSessions, skillScore: target.skillScore, hasCert: !!target.certification });
  const roleBadge = computeRoleBadge(solved.map((a) => a.lab.type));
  const skillEmblems = computeSkillEmblems(
    solved.map((a) => ({
      category: a.lab.category,
      difficulty: a.lab.difficulty,
      solvedAt: a.solvedAt ?? new Date(0),
    })),
    simSessions.length
  );

  const extra = (target.profileExtra ?? {}) as Record<string, unknown>;
  const projects = Array.isArray(extra.projects) ? extra.projects as { name: string; description: string; url: string }[] : [];
  const expertise = Array.isArray(extra.expertise) ? extra.expertise as string[] : [];
  const hiringFor = Array.isArray(extra.hiringFor) ? extra.hiringFor as string[] : [];

  const backHref = me.role === "RECRUITER" ? "/recruiter" : me.role === "INSTRUCTOR" ? "/classroom" : "/dashboard";
  const backLabel = me.role === "RECRUITER" ? "Marketplace" : me.role === "INSTRUCTOR" ? "Classroom" : "Dashboard";

  const formInitial = {
    displayName: target.displayName ?? "", university: target.university ?? "",
    linkedIn: target.linkedIn ?? "", github: target.github ?? "", bio: target.bio ?? "",
    skills: target.skills ?? [], cvUrl: target.cvUrl ?? "", company: target.company ?? "",
    jobTitle: target.jobTitle ?? "", website: target.website ?? "", projects, expertise, hiringFor,
  };

  // ── RECRUITER VIEW ────────────────────────────────────────────────────────
  if (!isOwnProfile && (me.role === "RECRUITER" || me.role === "ADMIN" || me.role === "INSTRUCTOR") && target.role === "STUDENT") {
    const rating = bestSimScore !== null ? toRating(bestSimScore) : null;
    const rStyle = rating ? RATING_STYLE[rating] : null;

    return (
      <div className="min-h-screen bg-surface-0 text-white">
        <Navbar backHref={backHref} backLabel={backLabel} />
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Assessment Banner */}
          {rating && rStyle && (
            <div className={`rounded-2xl border p-6 mb-6 flex items-center justify-between gap-4 ${rStyle.card}`}>
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Sage Vault Verified Assessment</p>
                <p className={`text-4xl font-black ${rStyle.text}`}>{rating}</p>
                <p className="text-sm text-ink-2 mt-1">
                  Based on {simSessions.length} simulation{simSessions.length !== 1 ? "s" : ""} · Best score: {bestSimScore}/100
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-5xl font-black text-ink-3">{bestSimScore}</div>
                <div className="text-xs text-ink-3">/100</div>
                <Link href={`/profile/${userId}/report`} target="_blank" className={`mt-2 inline-block text-xs font-semibold border rounded-lg px-3 py-1.5 ${rStyle.card} ${rStyle.text} hover:opacity-80 transition`}>
                  Download Report →
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-5">
              {/* Identity */}
              <div className="rounded-xl border border-edge bg-surface-1 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <CyberAvatar
                      initial={(target.displayName ?? target.email)[0].toUpperCase()}
                      skillScore={target.skillScore}
                      avatarUrl={target.avatarUrl}
                      size="md"
                      roleBadgeIcon={roleBadge?.icon}
                    />
                    <div>
                      <h1 className="text-xl font-bold">{target.displayName ?? target.email.split("@")[0]}</h1>
                      <p className="text-ink-3 text-sm">{target.email}</p>
                      {target.university && <p className="text-xs text-ink-3 mt-0.5">{target.university}</p>}
                      {roleBadge && (
                        <p className={`text-xs font-semibold mt-1 ${roleBadge.color}`}>
                          <Icon name={roleBadge.icon} size={14} /> {roleBadge.label}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="rounded-lg border border-ok-edge bg-ok-wash px-2.5 py-1 text-xs font-bold text-ok shrink-0">
                    {rank.label.toUpperCase()}
                  </span>
                </div>
                {target.bio && <p className="text-sm text-ink-2 leading-relaxed border-t border-edge-subtle pt-4">{target.bio}</p>}
                <div className="flex gap-3 mt-4 pt-4 border-t border-edge-subtle flex-wrap">
                  {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-info hover:underline">LinkedIn ↗</a>}
                  {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-ink-2 hover:underline">GitHub ↗</a>}
                  {target.cvUrl && <a href={target.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-ok hover:underline">CV / Resume ↗</a>}
                  <Link href={`/profile/${userId}/portfolio`} className="text-xs text-ok hover:underline">Portfolio ↗</Link>
                </div>
              </div>

              {/* Verified Activity */}
              <div className="rounded-xl border border-edge bg-surface-1 p-5">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Verified Activity</p>
                <div className="space-y-2">
                  {solved.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-edge-subtle last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-ok text-xs"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
                        <span className="text-ink-2">Solved <span className="font-medium">{a.lab.title}</span></span>
                        <span className="text-[10px] text-ink-3 font-mono uppercase">{a.lab.type.replace("_", " ")}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        a.lab.difficulty === "EASY" ? "text-ok border-ok-edge bg-ok-wash" :
                        a.lab.difficulty === "MEDIUM" ? "text-warn border-warn-edge bg-warn-wash" :
                        a.lab.difficulty === "HARD" ? "text-danger border-danger-edge bg-danger-wash" :
                        "text-accent border-accent-edge bg-accent-wash"
                      }`}>{a.lab.difficulty}</span>
                    </div>
                  ))}
                  {solved.length === 0 && <p className="text-ink-3 text-sm">No labs solved yet.</p>}
                  {solved.length > 6 && <p className="text-xs text-ink-3 pt-1">+{solved.length - 6} more labs solved</p>}
                </div>
              </div>

              {/* Skills */}
              {target.skills.length > 0 && (
                <div className="rounded-xl border border-edge bg-surface-1 p-5">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Declared Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {target.skills.map((s) => (
                      <span key={s} className="text-xs border border-ok-edge bg-ok-wash text-ok rounded-full px-3 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Key metrics */}
              <div className="rounded-xl border border-edge bg-surface-1 p-4 space-y-3">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Performance</p>
                {[
                  ["Skill Score", target.skillScore],
                  ["Labs Solved", solved.length],
                  ["Simulations", simSessions.length],
                ].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between items-center text-sm">
                    <span className="text-ink-3">{l}</span>
                    <span className="font-bold text-ink tabular-nums">{v}</span>
                  </div>
                ))}
                {bestSimScore !== null && (() => {
                  const r = toRating(bestSimScore);
                  const s = RATING_STYLE[r];
                  return (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-edge-subtle">
                      <span className="text-ink-3">Best Sim</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink">{bestSimScore}/100</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.card} ${s.text}`}>{r}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Skill Emblems */}
              {skillEmblems.length > 0 && (
                <div className="rounded-xl border border-edge bg-surface-1 p-4">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Skill Emblems</p>
                  <div className="flex flex-wrap gap-2">
                    {skillEmblems.map((e) => (
                      <span
                        key={e.category}
                        title={`${e.count} solve${e.count !== 1 ? "s" : ""} · Confidence ${e.confidence}%`}
                        className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
                          e.confidence >= 70
                            ? "border-ok-edge bg-ok-wash text-ok"
                            : e.confidence >= 40
                            ? "border-edge-strong bg-surface-1 text-ink-2"
                            : "border-edge-strong/60 bg-surface-1 text-ink-3"
                        }`}
                      >
                        <Icon name={e.icon} size={16} />
                        <span>{e.category}</span>
                        <span className="opacity-50 tabular-nums">({e.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div className="rounded-xl border border-edge bg-surface-1 p-4">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Earned Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b) => {
                      const s = TIER_STYLE[b.tier];
                      return (
                        <div key={b.id} title={b.description} className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${s.border} ${s.bg} ${s.text}`}>
                          <Icon name={b.icon} size={16} />
                          <span className="font-semibold">{b.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simulation runs */}
              {simSessions.length > 0 && (
                <div className="rounded-xl border border-edge bg-surface-1 p-4">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Simulation Runs</p>
                  <div className="space-y-2">
                    {simSessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink-2 truncate">{s.template.name}</span>
                        <span className={`font-bold ml-2 shrink-0 ${(s.score ?? 0) >= 75 ? "text-ok" : (s.score ?? 0) >= 50 ? "text-warn" : "text-danger"}`}>
                          {s.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI evaluation */}
              {target.aiEvaluations[0] && (
                <div className="rounded-xl border border-edge bg-surface-1 p-4">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">AI Assessment</p>
                  <p className="text-xs text-ink-2 leading-relaxed">{String(target.aiEvaluations[0].recommendation)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PEER VIEW (any logged-in user viewing someone else's profile) ─────────
  if (!isOwnProfile) {
    return (
      <div className="min-h-screen bg-surface-0 text-white">
        <Navbar backHref={backHref} backLabel={backLabel} />
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

          {/* Hero card */}
          <div className="rounded-2xl border border-edge bg-surface-1 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <CyberAvatar
                  initial={(target.displayName ?? target.email)[0].toUpperCase()}
                  skillScore={target.skillScore}
                  avatarUrl={target.avatarUrl}
                  size="lg"
                  roleBadgeIcon={roleBadge?.icon}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h1 className="text-xl font-bold">{target.displayName ?? target.email.split("@")[0]}</h1>
                    {target.certification && (
                      <Link href={`/verify/${target.certification.certId}`} className="text-xs font-bold border border-ok-edge bg-ok-wash text-ok rounded-full px-2.5 py-0.5 hover:bg-ok-wash transition">
                        IR Commander <Icon name="check" size={14} className="inline-block shrink-0" />
                      </Link>
                    )}
                  </div>
                  {roleBadge && (
                    <p className={`text-xs font-semibold mb-1 ${roleBadge.color}`}><Icon name={roleBadge.icon} size={14} /> {roleBadge.label}</p>
                  )}
                  {target.university && <p className="text-xs text-ink-3">{target.university}</p>}
                  {target.jobTitle && <p className="text-sm text-ink-2">{target.jobTitle}{target.company ? ` · ${target.company}` : ""}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-black text-ink tabular-nums">{target.skillScore}</p>
                <p className="text-[10px] text-ink-3 mb-0.5">Skill Score</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md border border-ok-edge bg-ok-wash text-ok">{rank.label.toUpperCase()}</span>
              </div>
            </div>

            {target.bio && <p className="text-sm text-ink-2 leading-relaxed border-t border-edge-subtle pt-4 mb-4">{target.bio}</p>}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["Labs Solved", solved.length], ["Simulations", simSessions.length], ["Best Score", bestSimScore !== null ? `${bestSimScore}/100` : "—"]].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border border-edge-subtle bg-surface-0/50 p-3 text-center">
                  <p className="text-lg font-bold text-ink">{v}</p>
                  <p className="text-[10px] text-ink-3 uppercase tracking-wider mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="flex gap-4 flex-wrap pt-3 border-t border-edge-subtle">
              {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-info hover:underline">LinkedIn ↗</a>}
              {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-ink-2 hover:underline">GitHub ↗</a>}
              {target.website && <a href={target.website} target="_blank" rel="noreferrer" className="text-xs text-ink-2 hover:underline">Website ↗</a>}
            </div>
          </div>

          {/* Skill emblems */}
          {skillEmblems.length > 0 && (
            <div className="rounded-xl border border-edge bg-surface-1 p-5">
              <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Skill Emblems</p>
              <div className="flex flex-wrap gap-2">
                {skillEmblems.map((e) => (
                  <span
                    key={e.category}
                    title={`${e.count} solve${e.count !== 1 ? "s" : ""} · Confidence ${e.confidence}%`}
                    className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
                      e.confidence >= 70
                        ? "border-ok-edge bg-ok-wash text-ok"
                        : e.confidence >= 40
                        ? "border-edge-strong bg-surface-1 text-ink-2"
                        : "border-edge-strong/60 bg-surface-1 text-ink-3"
                    }`}
                  >
                    <Icon name={e.icon} size={16} /><span>{e.category}</span><span className="opacity-50 tabular-nums">({e.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="rounded-xl border border-edge bg-surface-1 p-5">
              <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Achievements</p>
              <div className="flex flex-wrap gap-2.5">
                {badges.map((b) => {
                  const s = TIER_STYLE[b.tier];
                  return (
                    <div key={b.id} title={b.description} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${s.border} ${s.bg}`}>
                      <Icon name={b.icon} size={20} />
                      <div>
                        <p className={`text-xs font-bold ${s.text}`}>{b.label}</p>
                        <p className="text-[10px] text-ink-3">{b.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Labs + Sims */}
          {(solved.length > 0 || simSessions.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {solved.length > 0 && (
                <div className="rounded-xl border border-edge bg-surface-1 p-5">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">CTFs &amp; Labs Cleared</p>
                  <div className="space-y-2">
                    {solved.slice(0, 8).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-ok text-xs shrink-0"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
                          <span className="text-ink-2 truncate">{a.lab.title}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ml-2 shrink-0 ${
                          a.lab.difficulty === "EASY" ? "text-ok border-ok-edge bg-ok-wash" :
                          a.lab.difficulty === "MEDIUM" ? "text-warn border-warn-edge bg-warn-wash" :
                          a.lab.difficulty === "HARD" ? "text-danger border-danger-edge bg-danger-wash" :
                          "text-accent border-accent-edge bg-accent-wash"
                        }`}>{a.lab.difficulty}</span>
                      </div>
                    ))}
                    {solved.length > 8 && <p className="text-xs text-ink-3 pt-1">+{solved.length - 8} more</p>}
                  </div>
                </div>
              )}
              {simSessions.length > 0 && (
                <div className="rounded-xl border border-edge bg-surface-1 p-5">
                  <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Simulation Runs</p>
                  <div className="space-y-2">
                    {simSessions.slice(0, 6).map((s) => {
                      const score = s.score ?? 0;
                      const rStyle = RATING_STYLE[toRating(score)];
                      return (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-ink-2 truncate">{s.template.name}</span>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span className="font-bold text-ink">{score}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rStyle.card} ${rStyle.text}`}>{toRating(score)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skills */}
          {target.skills.length > 0 && (
            <div className="rounded-xl border border-edge bg-surface-1 p-5">
              <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {target.skills.map((s) => (
                  <span key={s} className="text-xs border border-ok-edge bg-ok-wash text-ok rounded-full px-3 py-1">{s}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── OWN PROFILE ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl border border-edge bg-surface-1 p-6">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-5">
            <div className="flex items-center gap-4">
              <CyberAvatar
                initial={(target.displayName ?? target.email)[0].toUpperCase()}
                skillScore={target.skillScore}
                avatarUrl={target.avatarUrl}
                size="lg"
                roleBadgeIcon={roleBadge?.icon}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{target.displayName ?? target.email.split("@")[0]}</h1>
                  {target.certification && (
                    <Link href={`/verify/${target.certification.certId}`} className="text-xs font-bold border border-ok-edge bg-ok-wash text-ok rounded-full px-2.5 py-0.5 hover:bg-ok-wash transition">
                      IR Commander <Icon name="check" size={14} className="inline-block shrink-0" />
                    </Link>
                  )}
                </div>
                {roleBadge && (
                  <p className={`text-xs font-semibold mb-1 ${roleBadge.color}`}>
                    <Icon name={roleBadge.icon} size={14} /> {roleBadge.label}
                  </p>
                )}
                {target.jobTitle && <p className="text-sm text-ink-2">{target.jobTitle}{target.company ? ` · ${target.company}` : ""}</p>}
                {!target.jobTitle && target.university && <p className="text-sm text-ink-2">{target.university}</p>}
                <p className="text-xs text-ink-3">{target.email}</p>
              </div>
            </div>

            {target.role === "STUDENT" && (
              <div className="text-right shrink-0">
                <p className="text-4xl font-black text-ink tabular-nums">{target.skillScore}</p>
                <p className="text-xs text-ink-3">Skill Score</p>
                <p className="text-xs font-bold text-ok mt-0.5">{rank.label.toUpperCase()}</p>
                {rank.nextLabel && (
                  <div className="mt-2 w-32">
                    <div className="flex justify-between text-[10px] text-ink-3 mb-1">
                      <span>{rank.pct}%</span><span>{rank.nextLabel}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rank.pct}%`, backgroundColor: rank.color }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {target.bio && <p className="text-sm text-ink-2 leading-relaxed border-t border-edge-subtle pt-4 mb-4">{target.bio}</p>}

          {/* Stats row */}
          {target.role === "STUDENT" && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["Labs Solved", solved.length], ["Simulations", simSessions.length], ["Best Score", bestSimScore !== null ? `${bestSimScore}/100` : "—"]].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border border-edge-subtle bg-surface-0/50 p-3 text-center">
                  <p className="text-lg font-bold text-ink">{v}</p>
                  <p className="text-[10px] text-ink-3 uppercase tracking-wider mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {target.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-edge-subtle">
              {target.skills.map((s) => (
                <span key={s} className="text-xs border border-ok-edge bg-ok-wash text-ok rounded-full px-3 py-1">{s}</span>
              ))}
            </div>
          )}
          {expertise.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-edge-subtle">
              {expertise.map((s) => <span key={s} className="text-xs border border-info-edge bg-info-wash text-info rounded-full px-3 py-1">{s}</span>)}
            </div>
          )}

          {/* Skill emblems — weighted by difficulty + recency */}
          {skillEmblems.length > 0 && (
            <div className="pt-4 border-t border-edge-subtle">
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-2">Skill Emblems</p>
              <div className="flex flex-wrap gap-2">
                {skillEmblems.map((e) => (
                  <span
                    key={e.category}
                    title={`${e.count} solve${e.count !== 1 ? "s" : ""} · Confidence ${e.confidence}%`}
                    className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
                      e.confidence >= 70
                        ? "border-ok-edge bg-ok-wash text-ok"
                        : e.confidence >= 40
                        ? "border-edge-strong bg-surface-1 text-ink-2"
                        : "border-edge-strong/60 bg-surface-1 text-ink-3"
                    }`}
                  >
                    <Icon name={e.icon} size={16} />
                    <span>{e.category}</span>
                    <span className="opacity-50 tabular-nums">({e.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-edge-subtle flex-wrap">
            {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-info hover:underline">LinkedIn ↗</a>}
            {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-ink-2 hover:underline">GitHub ↗</a>}
            {target.website && <a href={target.website} target="_blank" rel="noreferrer" className="text-xs text-ink-2 hover:underline">Website ↗</a>}
            {target.cvUrl && <a href={target.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-ok hover:underline">CV ↗</a>}
            <Link href={`/profile/${userId}/portfolio`} className="text-xs text-ok hover:underline">Portfolio ↗</Link>
          </div>
        </div>

        {/* First-time / no activity yet */}
        {target.role === "STUDENT" && solved.length === 0 && simSessions.length === 0 && badges.length === 0 && (
          <div className="rounded-xl border border-edge bg-surface-1">
            <EmptyState
              icon="launch"
              title="Your profile is ready — now build a track record"
              description="Solve labs and run simulations to earn badges, skill emblems, and a skill score that recruiters can see."
              action={{ label: "Browse Labs", href: "/labs" }}
            />
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-xl border border-edge bg-surface-1 p-5">
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Achievements</p>
            <div className="flex flex-wrap gap-2.5">
              {badges.map((b) => {
                const s = TIER_STYLE[b.tier];
                return (
                  <div key={b.id} title={b.description} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${s.border} ${s.bg}`}>
                    <Icon name={b.icon} size={20} />
                    <div>
                      <p className={`text-xs font-bold ${s.text}`}>{b.label}</p>
                      <p className="text-[10px] text-ink-3">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity: labs + sims */}
        {target.role === "STUDENT" && (solved.length > 0 || simSessions.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {solved.length > 0 && (
              <div className="rounded-xl border border-edge bg-surface-1 p-5">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Labs Completed</p>
                <div className="space-y-2">
                  {solved.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-ok text-xs shrink-0"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
                        <span className="text-ink-2 truncate">{a.lab.title}</span>
                      </div>
                      <span className="text-[10px] text-ink-3 font-mono uppercase ml-2 shrink-0">{a.lab.type.replace("_", " ")}</span>
                    </div>
                  ))}
                  {solved.length > 8 && <p className="text-xs text-ink-3 pt-1">+{solved.length - 8} more</p>}
                </div>
              </div>
            )}
            {simSessions.length > 0 && (
              <div className="rounded-xl border border-edge bg-surface-1 p-5">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Simulation History</p>
                <div className="space-y-3">
                  {simSessions.slice(0, 6).map((s) => {
                    const score = s.score ?? 0;
                    const rStyle = RATING_STYLE[toRating(score)];
                    return (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-2 truncate">{s.template.name}</span>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="font-bold text-ink">{score}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rStyle.card} ${rStyle.text}`}>{toRating(score)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="rounded-xl border border-edge bg-surface-1 p-5">
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">Projects</p>
            <div className="space-y-4">
              {projects.map((p, i) => (
                <div key={i} className="border-t border-edge-subtle pt-4 first:border-0 first:pt-0">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm text-ink">{p.name}</p>
                    {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-ok hover:underline ml-3 shrink-0">View ↗</a>}
                  </div>
                  {p.description && <p className="text-xs text-ink-2 mt-1 leading-relaxed">{p.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit form */}
        <div className="rounded-xl border border-edge bg-surface-1 p-6">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-6">Edit Profile</p>
          <div className="mb-6 pb-6 border-b border-edge-subtle">
            <p className="text-xs text-ink-3 mb-3">Profile Photo</p>
            <AvatarUpload
              currentUrl={target.avatarUrl ?? null}
              initial={(target.displayName ?? target.email)[0].toUpperCase()}
            />
          </div>
          <ProfileFormClient userId={target.id} role={target.role} initial={formInitial} />
        </div>

        {/* Role switcher dev/admin */}
        {(process.env.NODE_ENV !== "production" || me.role === "ADMIN") && (
          <div className="rounded-xl border border-dashed border-edge-strong p-5">
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Switch Role <span className="text-ink-3">(dev)</span></p>
            <div className="flex gap-2 flex-wrap">
              {(["STUDENT", "INSTRUCTOR", "RECRUITER"] as const).map((r) => (
                <a key={r} href={`/api/user/switch-role?role=${r}`}
                  className={`text-xs font-bold uppercase tracking-widest border rounded px-3 py-1.5 transition ${
                    target.role === r ? "border-edge-strong bg-surface-2 text-white" :
                    r === "STUDENT" ? "border-ok-edge text-ok hover:bg-ok-wash" :
                    r === "INSTRUCTOR" ? "border-info-edge text-info hover:bg-info-wash" :
                    "border-warn-edge text-warn hover:bg-warn-wash"
                  }`}
                >
                  {target.role === r ? <>{r} <Icon name="check" size={11} className="inline-block" /></> : r}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
