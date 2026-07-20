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

export const dynamic = "force-dynamic";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_STYLE = {
  EXCEPTIONAL: { card: "border-emerald-500/40 bg-emerald-500/5",  text: "text-emerald-400", bar: "bg-emerald-500" },
  STRONG:      { card: "border-blue-500/40 bg-blue-500/5",        text: "text-blue-400",    bar: "bg-blue-500" },
  ADEQUATE:    { card: "border-amber-500/40 bg-amber-500/5",      text: "text-amber-400",   bar: "bg-amber-500" },
  DEVELOPING:  { card: "border-zinc-700 bg-zinc-900",             text: "text-zinc-400",    bar: "bg-zinc-600" },
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
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar backHref={backHref} backLabel={backLabel} />
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Assessment Banner */}
          {rating && rStyle && (
            <div className={`rounded-2xl border p-6 mb-6 flex items-center justify-between gap-4 ${rStyle.card}`}>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Sage Vault Verified Assessment</p>
                <p className={`text-4xl font-black ${rStyle.text}`}>{rating}</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Based on {simSessions.length} simulation{simSessions.length !== 1 ? "s" : ""} · Best score: {bestSimScore}/100
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-5xl font-black text-zinc-700">{bestSimScore}</div>
                <div className="text-xs text-zinc-600">/100</div>
                <Link href={`/profile/${userId}/report`} target="_blank" className={`mt-2 inline-block text-xs font-semibold border rounded-lg px-3 py-1.5 ${rStyle.card} ${rStyle.text} hover:opacity-80 transition`}>
                  Download Report →
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-5">
              {/* Identity */}
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6">
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
                      <p className="text-zinc-500 text-sm">{target.email}</p>
                      {target.university && <p className="text-xs text-zinc-600 mt-0.5">{target.university}</p>}
                      {roleBadge && (
                        <p className={`text-xs font-semibold mt-1 ${roleBadge.color}`}>
                          {roleBadge.icon} {roleBadge.label}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-2.5 py-1 text-xs font-bold text-emerald-400 shrink-0">
                    {rank.label.toUpperCase()}
                  </span>
                </div>
                {target.bio && <p className="text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-4">{target.bio}</p>}
                <div className="flex gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
                  {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">LinkedIn ↗</a>}
                  {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">GitHub ↗</a>}
                  {target.cvUrl && <a href={target.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline">CV / Resume ↗</a>}
                  <Link href={`/profile/${userId}/portfolio`} className="text-xs text-sage-400 hover:underline">Portfolio ↗</Link>
                </div>
              </div>

              {/* Verified Activity */}
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Verified Activity</p>
                <div className="space-y-2">
                  {solved.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500 text-xs">✓</span>
                        <span className="text-zinc-300">Solved <span className="font-medium">{a.lab.title}</span></span>
                        <span className="text-[10px] text-zinc-600 font-mono uppercase">{a.lab.type.replace("_", " ")}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        a.lab.difficulty === "EASY" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" :
                        a.lab.difficulty === "MEDIUM" ? "text-amber-400 border-amber-500/20 bg-amber-500/8" :
                        a.lab.difficulty === "HARD" ? "text-red-400 border-red-500/20 bg-red-500/8" :
                        "text-purple-400 border-purple-500/20 bg-purple-500/8"
                      }`}>{a.lab.difficulty}</span>
                    </div>
                  ))}
                  {solved.length === 0 && <p className="text-zinc-600 text-sm">No labs solved yet.</p>}
                  {solved.length > 6 && <p className="text-xs text-zinc-600 pt-1">+{solved.length - 6} more labs solved</p>}
                </div>
              </div>

              {/* Skills */}
              {target.skills.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Declared Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {target.skills.map((s) => (
                      <span key={s} className="text-xs border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 rounded-full px-3 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Key metrics */}
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 space-y-3">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Performance</p>
                {[
                  ["Skill Score", target.skillScore],
                  ["Labs Solved", solved.length],
                  ["Simulations", simSessions.length],
                ].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">{l}</span>
                    <span className="font-bold text-zinc-100 tabular-nums">{v}</span>
                  </div>
                ))}
                {bestSimScore !== null && (() => {
                  const r = toRating(bestSimScore);
                  const s = RATING_STYLE[r];
                  return (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                      <span className="text-zinc-500">Best Sim</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100">{bestSimScore}/100</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.card} ${s.text}`}>{r}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Skill Emblems */}
              {skillEmblems.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Skill Emblems</p>
                  <div className="flex flex-wrap gap-2">
                    {skillEmblems.map((e) => (
                      <span
                        key={e.category}
                        title={`${e.count} solve${e.count !== 1 ? "s" : ""} · Confidence ${e.confidence}%`}
                        className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
                          e.confidence >= 70
                            ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
                            : e.confidence >= 40
                            ? "border-zinc-600 bg-zinc-900 text-zinc-300"
                            : "border-zinc-700/60 bg-zinc-900/60 text-zinc-500"
                        }`}
                      >
                        <span>{e.icon}</span>
                        <span>{e.category}</span>
                        <span className="opacity-50 tabular-nums">({e.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Earned Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b) => {
                      const s = TIER_STYLE[b.tier];
                      return (
                        <div key={b.id} title={b.description} className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${s.border} ${s.bg} ${s.text}`}>
                          <span>{b.icon}</span>
                          <span className="font-semibold">{b.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simulation runs */}
              {simSessions.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Simulation Runs</p>
                  <div className="space-y-2">
                    {simSessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 truncate">{s.template.name}</span>
                        <span className={`font-bold ml-2 shrink-0 ${(s.score ?? 0) >= 75 ? "text-emerald-400" : (s.score ?? 0) >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {s.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI evaluation */}
              {target.aiEvaluations[0] && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">AI Assessment</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{String(target.aiEvaluations[0].recommendation)}</p>
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
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar backHref={backHref} backLabel={backLabel} />
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

          {/* Hero card */}
          <div className="rounded-2xl border border-white/8 bg-zinc-900/40 p-6">
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
                      <Link href={`/verify/${target.certification.certId}`} className="text-xs font-bold border border-emerald-500/40 bg-emerald-500/8 text-emerald-400 rounded-full px-2.5 py-0.5 hover:bg-emerald-500/15 transition">
                        IR Commander ✓
                      </Link>
                    )}
                  </div>
                  {roleBadge && (
                    <p className={`text-xs font-semibold mb-1 ${roleBadge.color}`}>{roleBadge.icon} {roleBadge.label}</p>
                  )}
                  {target.university && <p className="text-xs text-zinc-500">{target.university}</p>}
                  {target.jobTitle && <p className="text-sm text-zinc-300">{target.jobTitle}{target.company ? ` · ${target.company}` : ""}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-black text-zinc-100 tabular-nums">{target.skillScore}</p>
                <p className="text-[10px] text-zinc-500 mb-0.5">Skill Score</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/8 text-emerald-400">{rank.label.toUpperCase()}</span>
              </div>
            </div>

            {target.bio && <p className="text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-4 mb-4">{target.bio}</p>}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["Labs Solved", solved.length], ["Simulations", simSessions.length], ["Best Score", bestSimScore !== null ? `${bestSimScore}/100` : "—"]].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border border-white/5 bg-zinc-950/50 p-3 text-center">
                  <p className="text-lg font-bold text-zinc-100">{v}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="flex gap-4 flex-wrap pt-3 border-t border-white/5">
              {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">LinkedIn ↗</a>}
              {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">GitHub ↗</a>}
              {target.website && <a href={target.website} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">Website ↗</a>}
            </div>
          </div>

          {/* Skill emblems */}
          {skillEmblems.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Skill Emblems</p>
              <div className="flex flex-wrap gap-2">
                {skillEmblems.map((e) => (
                  <span
                    key={e.category}
                    title={`${e.count} solve${e.count !== 1 ? "s" : ""} · Confidence ${e.confidence}%`}
                    className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
                      e.confidence >= 70
                        ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
                        : e.confidence >= 40
                        ? "border-zinc-600 bg-zinc-900 text-zinc-300"
                        : "border-zinc-700/60 bg-zinc-900/60 text-zinc-500"
                    }`}
                  >
                    <span>{e.icon}</span><span>{e.category}</span><span className="opacity-50 tabular-nums">({e.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Achievements</p>
              <div className="flex flex-wrap gap-2.5">
                {badges.map((b) => {
                  const s = TIER_STYLE[b.tier];
                  return (
                    <div key={b.id} title={b.description} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${s.border} ${s.bg}`}>
                      <span className="text-lg">{b.icon}</span>
                      <div>
                        <p className={`text-xs font-bold ${s.text}`}>{b.label}</p>
                        <p className="text-[10px] text-zinc-600">{b.description}</p>
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
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">CTFs &amp; Labs Cleared</p>
                  <div className="space-y-2">
                    {solved.slice(0, 8).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-emerald-500 text-xs shrink-0">✓</span>
                          <span className="text-zinc-300 truncate">{a.lab.title}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ml-2 shrink-0 ${
                          a.lab.difficulty === "EASY" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" :
                          a.lab.difficulty === "MEDIUM" ? "text-amber-400 border-amber-500/20 bg-amber-500/8" :
                          a.lab.difficulty === "HARD" ? "text-red-400 border-red-500/20 bg-red-500/8" :
                          "text-purple-400 border-purple-500/20 bg-purple-500/8"
                        }`}>{a.lab.difficulty}</span>
                      </div>
                    ))}
                    {solved.length > 8 && <p className="text-xs text-zinc-600 pt-1">+{solved.length - 8} more</p>}
                  </div>
                </div>
              )}
              {simSessions.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Simulation Runs</p>
                  <div className="space-y-2">
                    {simSessions.slice(0, 6).map((s) => {
                      const score = s.score ?? 0;
                      const rStyle = RATING_STYLE[toRating(score)];
                      return (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400 truncate">{s.template.name}</span>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span className="font-bold text-zinc-100">{score}</span>
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
            <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {target.skills.map((s) => (
                  <span key={s} className="text-xs border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 rounded-full px-3 py-1">{s}</span>
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl border border-white/8 bg-zinc-900/40 p-6">
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
                    <Link href={`/verify/${target.certification.certId}`} className="text-xs font-bold border border-emerald-500/40 bg-emerald-500/8 text-emerald-400 rounded-full px-2.5 py-0.5 hover:bg-emerald-500/15 transition">
                      IR Commander ✓
                    </Link>
                  )}
                </div>
                {roleBadge && (
                  <p className={`text-xs font-semibold mb-1 ${roleBadge.color}`}>
                    {roleBadge.icon} {roleBadge.label}
                  </p>
                )}
                {target.jobTitle && <p className="text-sm text-zinc-300">{target.jobTitle}{target.company ? ` · ${target.company}` : ""}</p>}
                {!target.jobTitle && target.university && <p className="text-sm text-zinc-400">{target.university}</p>}
                <p className="text-xs text-zinc-600">{target.email}</p>
              </div>
            </div>

            {target.role === "STUDENT" && (
              <div className="text-right shrink-0">
                <p className="text-4xl font-black text-zinc-100 tabular-nums">{target.skillScore}</p>
                <p className="text-xs text-zinc-500">Skill Score</p>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">{rank.label.toUpperCase()}</p>
                {rank.nextLabel && (
                  <div className="mt-2 w-32">
                    <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
                      <span>{rank.pct}%</span><span>{rank.nextLabel}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rank.pct}%`, backgroundColor: rank.color }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {target.bio && <p className="text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-4 mb-4">{target.bio}</p>}

          {/* Stats row */}
          {target.role === "STUDENT" && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["Labs Solved", solved.length], ["Simulations", simSessions.length], ["Best Score", bestSimScore !== null ? `${bestSimScore}/100` : "—"]].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border border-white/5 bg-zinc-950/50 p-3 text-center">
                  <p className="text-lg font-bold text-zinc-100">{v}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {target.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
              {target.skills.map((s) => (
                <span key={s} className="text-xs border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 rounded-full px-3 py-1">{s}</span>
              ))}
            </div>
          )}
          {expertise.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
              {expertise.map((s) => <span key={s} className="text-xs border border-blue-500/20 bg-blue-500/8 text-blue-400 rounded-full px-3 py-1">{s}</span>)}
            </div>
          )}

          {/* Skill emblems — weighted by difficulty + recency */}
          {skillEmblems.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Skill Emblems</p>
              <div className="flex flex-wrap gap-2">
                {skillEmblems.map((e) => (
                  <span
                    key={e.category}
                    title={`${e.count} solve${e.count !== 1 ? "s" : ""} · Confidence ${e.confidence}%`}
                    className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
                      e.confidence >= 70
                        ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
                        : e.confidence >= 40
                        ? "border-zinc-600 bg-zinc-900 text-zinc-300"
                        : "border-zinc-700/60 bg-zinc-900/60 text-zinc-500"
                    }`}
                  >
                    <span>{e.icon}</span>
                    <span>{e.category}</span>
                    <span className="opacity-50 tabular-nums">({e.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/5 flex-wrap">
            {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">LinkedIn ↗</a>}
            {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">GitHub ↗</a>}
            {target.website && <a href={target.website} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">Website ↗</a>}
            {target.cvUrl && <a href={target.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline">CV ↗</a>}
            <Link href={`/profile/${userId}/portfolio`} className="text-xs text-sage-400 hover:underline">Portfolio ↗</Link>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Achievements</p>
            <div className="flex flex-wrap gap-2.5">
              {badges.map((b) => {
                const s = TIER_STYLE[b.tier];
                return (
                  <div key={b.id} title={b.description} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${s.border} ${s.bg}`}>
                    <span className="text-lg">{b.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${s.text}`}>{b.label}</p>
                      <p className="text-[10px] text-zinc-600">{b.description}</p>
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
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Labs Completed</p>
                <div className="space-y-2">
                  {solved.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-emerald-500 text-xs shrink-0">✓</span>
                        <span className="text-zinc-300 truncate">{a.lab.title}</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono uppercase ml-2 shrink-0">{a.lab.type.replace("_", " ")}</span>
                    </div>
                  ))}
                  {solved.length > 8 && <p className="text-xs text-zinc-600 pt-1">+{solved.length - 8} more</p>}
                </div>
              </div>
            )}
            {simSessions.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Simulation History</p>
                <div className="space-y-3">
                  {simSessions.slice(0, 6).map((s) => {
                    const score = s.score ?? 0;
                    const rStyle = RATING_STYLE[toRating(score)];
                    return (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400 truncate">{s.template.name}</span>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="font-bold text-zinc-100">{score}</span>
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
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Projects</p>
            <div className="space-y-4">
              {projects.map((p, i) => (
                <div key={i} className="border-t border-white/5 pt-4 first:border-0 first:pt-0">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm text-zinc-100">{p.name}</p>
                    {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline ml-3 shrink-0">View ↗</a>}
                  </div>
                  {p.description && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{p.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit form */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Edit Profile</p>
          <div className="mb-6 pb-6 border-b border-white/5">
            <p className="text-xs text-zinc-500 mb-3">Profile Photo</p>
            <AvatarUpload
              currentUrl={target.avatarUrl ?? null}
              initial={(target.displayName ?? target.email)[0].toUpperCase()}
            />
          </div>
          <ProfileFormClient userId={target.id} role={target.role} initial={formInitial} />
        </div>

        {/* Role switcher dev/admin */}
        {(process.env.NODE_ENV !== "production" || me.role === "ADMIN") && (
          <div className="rounded-xl border border-dashed border-zinc-800 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-700 mb-3">Switch Role <span className="text-zinc-800">(dev)</span></p>
            <div className="flex gap-2 flex-wrap">
              {(["STUDENT", "INSTRUCTOR", "RECRUITER"] as const).map((r) => (
                <a key={r} href={`/api/user/switch-role?role=${r}`}
                  className={`text-xs font-bold uppercase tracking-widest border rounded px-3 py-1.5 transition ${
                    target.role === r ? "border-white/30 bg-white/10 text-white" :
                    r === "STUDENT" ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" :
                    r === "INSTRUCTOR" ? "border-blue-500/40 text-blue-400 hover:bg-blue-500/10" :
                    "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  {target.role === r ? `${r} ✓` : r}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
