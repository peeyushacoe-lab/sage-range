import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { ProfileFormClient } from "./_components/profile-form-client";

export const dynamic = "force-dynamic";

const RANKS = [
  { label: "Recruit", min: 0 }, { label: "Analyst I", min: 100 },
  { label: "Analyst II", min: 300 }, { label: "Senior Analyst", min: 600 },
  { label: "Lead Analyst", min: 1000 }, { label: "Principal", min: 2000 },
] as const;

function getRank(score: number) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (score >= RANKS[i].min) idx = i;
  const r = RANKS[idx];
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  const pct = next ? Math.min(100, Math.round(((score - r.min) / (next.min - r.min)) * 100)) : 100;
  return { label: r.label, next: next?.label ?? null, nextMin: next?.min ?? null, pct };
}

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_STYLE: Record<string, { card: string; text: string }> = {
  EXCEPTIONAL: { card: "border-sage-500/40 bg-sage-500/5",   text: "text-sage-400" },
  STRONG:      { card: "border-blue-500/40 bg-blue-500/5",   text: "text-blue-400" },
  ADEQUATE:    { card: "border-amber-500/40 bg-amber-500/5", text: "text-amber-400" },
  DEVELOPING:  { card: "border-zinc-700 bg-zinc-900",        text: "text-zinc-400" },
};

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const canView = me.id === userId || me.role === "RECRUITER" || me.role === "INSTRUCTOR" || me.role === "ADMIN";
  if (!canView) redirect("/dashboard");

  const [target, simSessions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: {
        attempts: { include: { lab: true }, orderBy: { startedAt: "desc" } },
        aiEvaluations: { orderBy: { createdAt: "desc" }, take: 5 },
        certification: true,
      },
    }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      include: { template: true },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);
  if (!target) notFound();

  const isOwnProfile = me.id === userId;
  const viewerRole = me.role ?? "STUDENT";
  const targetRole = target.role ?? "STUDENT";
  const solved = target.attempts.filter((a) => a.status === "SOLVED");
  const bestSimScore = simSessions.length > 0 ? Math.max(...simSessions.map((s) => s.score)) : null;
  const rank = getRank(target.skillScore);

  const extra = (target.profileExtra ?? {}) as Record<string, unknown>;
  const projects = Array.isArray(extra.projects) ? extra.projects as { name: string; description: string; url: string }[] : [];
  const expertise = Array.isArray(extra.expertise) ? extra.expertise as string[] : [];
  const hiringFor = Array.isArray(extra.hiringFor) ? extra.hiringFor as string[] : [];

  const backHref = viewerRole === "RECRUITER" ? "/recruiter" : viewerRole === "INSTRUCTOR" ? "/classroom" : "/dashboard";
  const backLabel = viewerRole === "RECRUITER" ? "Marketplace" : viewerRole === "INSTRUCTOR" ? "Classroom" : "Dashboard";

  const formInitial = {
    displayName: target.displayName ?? "",
    university: target.university ?? "",
    linkedIn: target.linkedIn ?? "",
    github: target.github ?? "",
    bio: target.bio ?? "",
    skills: target.skills ?? [],
    cvUrl: target.cvUrl ?? "",
    company: target.company ?? "",
    jobTitle: target.jobTitle ?? "",
    website: target.website ?? "",
    projects,
    expertise,
    hiringFor,
  };

  // ── RECRUITER VIEWING A STUDENT ───────────────────────────────────────────
  if (viewerRole === "RECRUITER" && !isOwnProfile && targetRole === "STUDENT") {
    const rating = bestSimScore !== null ? toRating(bestSimScore) : null;
    const rStyle = rating ? RATING_STYLE[rating] : null;
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar backHref={backHref} backLabel={backLabel} />
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Download report */}
          <div className="flex justify-end">
            <Link
              href={`/profile/${userId}/report`}
              target="_blank"
              className="rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-400 px-4 py-2 text-xs font-semibold hover:bg-amber-500/15 transition"
            >
              Download Assessment Report →
            </Link>
          </div>

          {/* Assessment banner */}
          {rating && rStyle && (
            <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${rStyle.card}`}>
              <div>
                <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Sage Forge Assessment</p>
                <p className={`text-3xl font-bold ${rStyle.text}`}>{rating}</p>
                <p className="text-sm text-zinc-400 mt-1">{simSessions.length} simulation{simSessions.length !== 1 ? "s" : ""} · Best score: {bestSimScore} / 100</p>
              </div>
              {target.aiEvaluations[0]?.recommendation && (
                <span className={`text-xs font-bold uppercase border rounded-full px-3 py-1.5 ${rStyle.card} ${rStyle.text}`}>
                  {target.aiEvaluations[0].recommendation}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-5">
              {/* Identity */}
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h1 className="text-2xl font-bold">{target.displayName ?? target.email.split("@")[0]}</h1>
                    <p className="text-zinc-400 text-sm">{target.email}</p>
                    {target.university && <p className="text-xs text-zinc-500 mt-0.5">{target.university}</p>}
                  </div>
                  <span className="rounded border border-emerald-500/40 bg-emerald-500/8 px-2.5 py-0.5 text-xs font-bold text-emerald-400">{rank.label.toUpperCase()}</span>
                </div>
                {target.bio && <p className="text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-3">{target.bio}</p>}
                <div className="flex gap-3 mt-3">
                  {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">LinkedIn ↗</a>}
                  {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">GitHub ↗</a>}
                  {target.cvUrl && <a href={target.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-sage-400 hover:underline">CV / Resume ↗</a>}
                </div>
              </div>

              {/* Skills */}
              {target.skills.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {target.skills.map((s) => (
                      <span key={s} className="text-xs border border-sage-500/30 bg-sage-500/8 text-sage-400 rounded-full px-3 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Projects</p>
                  <div className="space-y-3">
                    {projects.map((p, i) => (
                      <div key={i} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-sm text-zinc-100">{p.name}</p>
                          {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-sage-400 hover:underline ml-3 shrink-0">View ↗</a>}
                        </div>
                        {p.description && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{p.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: stats */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 space-y-3">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Performance</p>
                {[["Skill Score", target.skillScore], ["Labs Solved", solved.length], ["Simulations", simSessions.length]].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{l}</span>
                    <span className="font-bold text-zinc-100">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm items-center">
                  <span className="text-zinc-500">Best Sim Score</span>
                  {bestSimScore !== null ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-100">{bestSimScore} / 100</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${RATING_STYLE[toRating(bestSimScore)].card} ${RATING_STYLE[toRating(bestSimScore)].text}`}>
                        {toRating(bestSimScore)}
                      </span>
                    </div>
                  ) : <span className="font-bold text-zinc-100">—</span>}
                </div>
              </div>
              {simSessions.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Simulation Runs</p>
                  <div className="space-y-2">
                    {simSessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 truncate">{s.template.name}</span>
                        <span className={`font-bold ml-2 shrink-0 ${s.status === "CONTAINED" ? "text-sage-400" : "text-red-400"}`}>{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── OWN PROFILE (any role) ────────────────────────────────────────────────
  if (isOwnProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Hero */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{target.displayName ?? target.email.split("@")[0]}</h1>
                  {targetRole === "STUDENT" && (
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/8 px-2.5 py-0.5 text-xs font-bold text-emerald-400">{rank.label.toUpperCase()}</span>
                  )}
                  {targetRole !== "STUDENT" && (
                    <span className={`rounded border px-2.5 py-0.5 text-xs font-bold ${targetRole === "RECRUITER" ? "border-amber-500/40 bg-amber-500/8 text-amber-400" : "border-blue-500/40 bg-blue-500/8 text-blue-400"}`}>{targetRole}</span>
                  )}
                  {target.certification && (
                    <Link href={`/verify/${target.certification.certId}`} className="rounded-full border border-emerald-500/40 bg-emerald-500/8 px-3 py-0.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 transition">IR Commander ✓</Link>
                  )}
                </div>
                {target.jobTitle && target.company && <p className="text-sm text-zinc-300">{target.jobTitle} · {target.company}</p>}
                {target.jobTitle && !target.company && <p className="text-sm text-zinc-300">{target.jobTitle}</p>}
                {target.university && !target.jobTitle && <p className="text-sm text-zinc-400">{target.university}</p>}
                <p className="text-xs text-zinc-500 mt-1">{target.email}</p>
                <div className="flex gap-3 mt-2">
                  {target.linkedIn && <a href={target.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">LinkedIn ↗</a>}
                  {target.github && <a href={target.github} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">GitHub ↗</a>}
                  {target.website && <a href={target.website} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:underline">Website ↗</a>}
                  {target.cvUrl && <a href={target.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-sage-400 hover:underline">CV ↗</a>}
                </div>
              </div>
              {targetRole === "STUDENT" && (
                <div className="text-right">
                  <p className="text-4xl font-bold">{target.skillScore}</p>
                  <p className="text-xs text-zinc-500">Skill Score</p>
                  {rank.next && (
                    <div className="mt-2 w-32">
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1"><span>{rank.pct}%</span><span>{rank.next}</span></div>
                      <div className="h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rank.pct}%` }} /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {target.bio && <p className="text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-4">{target.bio}</p>}

            {/* Skills / expertise / hiringFor chips */}
            {targetRole === "STUDENT" && target.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                {target.skills.map((s) => <span key={s} className="text-xs border border-sage-500/30 bg-sage-500/8 text-sage-400 rounded-full px-3 py-1">{s}</span>)}
              </div>
            )}
            {targetRole === "INSTRUCTOR" && expertise.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                {expertise.map((s) => <span key={s} className="text-xs border border-blue-500/30 bg-blue-500/8 text-blue-400 rounded-full px-3 py-1">{s}</span>)}
              </div>
            )}
            {targetRole === "RECRUITER" && hiringFor.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Currently Hiring</p>
                <div className="flex flex-wrap gap-2">
                  {hiringFor.map((r) => <span key={r} className="text-xs border border-amber-500/30 bg-amber-500/8 text-amber-400 rounded-full px-3 py-1">{r}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Student: projects + simulations */}
          {targetRole === "STUDENT" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {projects.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Projects</p>
                  <div className="space-y-4">
                    {projects.map((p, i) => (
                      <div key={i} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-sm">{p.name}</p>
                          {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-sage-400 hover:underline ml-2 shrink-0">↗</a>}
                        </div>
                        {p.description && <p className="text-xs text-zinc-400 mt-0.5">{p.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {simSessions.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Simulation History</p>
                  <div className="space-y-2">
                    {simSessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400 truncate">{s.template.name}</span>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className={s.status === "CONTAINED" ? "text-sage-400 font-bold" : "text-red-400 font-bold"}>{s.score}</span>
                          <span className="text-xs text-zinc-600">{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit form */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-6">Edit Profile</p>
            <ProfileFormClient userId={target.id} role={targetRole} initial={formInitial} />
          </div>

          {/* Role switcher: dev-only and admin */}
          {(process.env.NODE_ENV !== "production" || me.role === "ADMIN") && (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/20 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Switch Role <span className="text-zinc-700">(dev only)</span></p>
              <div className="flex gap-2 flex-wrap">
                {(["STUDENT", "INSTRUCTOR", "RECRUITER"] as const).map((r) => (
                  <a
                    key={r}
                    href={`/api/user/switch-role?role=${r}`}
                    className={`text-xs font-bold uppercase tracking-widest border rounded px-3 py-1.5 transition ${
                      targetRole === r
                        ? "border-white/30 bg-white/10 text-white cursor-default"
                        : r === "STUDENT"    ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                        : r === "INSTRUCTOR" ? "border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                                             : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                    }`}
                  >
                    {targetRole === r ? `${r} (current)` : r}
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-zinc-700 mt-2">Clicking a role updates your account instantly.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FALLBACK (instructor viewing student, etc.) ───────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref={backHref} backLabel={backLabel} />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
          <h1 className="text-xl font-bold mb-0.5">{target.displayName ?? target.email.split("@")[0]}</h1>
          <p className="text-sm text-zinc-400">{target.email}</p>
          {target.university && <p className="text-xs text-zinc-500">{target.university}</p>}
          {target.bio && <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{target.bio}</p>}
        </div>
        {[["Labs Solved", solved.length], ["Simulations", simSessions.length], ["Best Score", bestSimScore !== null ? `${bestSimScore} / 100` : "—"]].length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[["Labs Solved", solved.length], ["Simulations", simSessions.length], ["Best Score", bestSimScore !== null ? `${bestSimScore} / 100` : "—"]].map(([l, v]) => (
              <div key={String(l)} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 text-center">
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
