import Link from "next/link";
import { db } from "@/lib/db";
import { CertProgressCard } from "./cert-progress-card";
import { JoinClassroomClient } from "@/app/classroom/_components/classroom-hub-client";
import { listScenarios } from "@/lib/simulation/runtime/scenarios/manifest";
import type { AppUser } from "@/lib/current-user";

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

const TASK_COUNTS: Record<string, number> = {
  "welcome-ctf": 3, "sql-injection-101": 3, "soc-alert-investigation": 3,
};

const SCENARIOS = listScenarios().slice(0, 4).map((s) => ({
  id: s.id,
  slug: s.templateSlug,
  name: s.title,
  brief: s.subtitle,
  difficulty: s.difficulty,
  industry: s.archetypeId.replace(/_/g, " "),
}));

function diffBadge(d: string) {
  if (d === "HARD" || d === "INSANE") return "text-red-400 border-red-500/30 bg-red-500/10";
  if (d === "MEDIUM") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-zinc-400 border-zinc-700 bg-zinc-800";
}

function elapsed(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  return s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
}

export async function StudentHome({ user }: { user: AppUser }) {
  const [attempts, labs, solvedAttempts, activeSimulation, completedSims, enrolledClasses] = await Promise.all([
    db.attempt.findMany({ where: { userId: user.id }, include: { lab: true }, orderBy: { startedAt: "desc" }, take: 8 }),
    db.lab.findMany({ where: { published: true }, take: 6 }),
    db.attempt.findMany({ where: { userId: user.id, status: "SOLVED" }, include: { lab: { select: { id: true, type: true } } } }),
    db.simulationSession.findFirst({ where: { userId: user.id, status: "ACTIVE" }, include: { template: true }, orderBy: { startedAt: "desc" } }),
    db.simulationSession.findMany({ where: { userId: user.id, status: { in: ["CONTAINED", "BREACHED"] } }, select: { status: true, score: true }, orderBy: { score: "desc" } }),
    db.classroomEnrollment.findMany({
      where: { userId: user.id },
      include: { classroom: { select: { id: true, name: true, _count: { select: { assignments: true } } } } },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  const solvedIds = new Set(solvedAttempts.map((a) => a.lab.id));
  const rank = getRank(user.skillScore);
  const bestScore = completedSims[0]?.score ?? 0;
  const hasCTF = solvedAttempts.some((a) => a.lab.type === "CTF");
  const hasBlue = solvedAttempts.some((a) => a.lab.type === "BLUE_TEAM");
  const hasSim = completedSims.length > 0;

  const stages = [
    { label: "Cyber\nFoundations",  sub: "Solve a CTF lab",       done: hasCTF },
    { label: "Blue Team\nAnalyst",  sub: "Solve a blue-team lab",  done: hasBlue },
    { label: "IR\nSpecialist",      sub: "Complete a simulation",  done: hasSim },
    { label: "Crisis\nCommander",   sub: "Score 500+ in a sim",    done: completedSims.some((s) => (s.score ?? 0) >= 500) },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Command Center</p>
          <h1 className="text-2xl font-bold text-zinc-100">{user.displayName ?? user.email.split("@")[0]}</h1>
        </div>
        <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 tracking-wide">
          {rank.label.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Skill Score", value: user.skillScore, sub: <span className="text-emerald-500">{rank.label}</span> },
          { label: "XP", value: user.xp.toLocaleString(), sub: rank.next && (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs text-zinc-500"><span>{rank.pct}% to {rank.next}</span><span>{rank.nextMin}</span></div>
              <div className="h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rank.pct}%` }} /></div>
            </div>
          )},
          { label: "Labs Solved", value: solvedAttempts.length, sub: <span className="text-zinc-500">of {labs.length} available</span> },
          { label: "Simulations", value: completedSims.length, sub: <span className="text-zinc-500">{completedSims.length ? `best ${bestScore}` : "no runs yet"}</span> },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-zinc-100">{c.value}</p>
            <div className="text-xs mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <CertProgressCard />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">My Classes</h2>
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

      {activeSimulation ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/5 p-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Incident In Progress</p>
            </div>
            <p className="text-lg font-bold text-zinc-100">{activeSimulation.template.name}</p>
            <p className="text-sm text-zinc-400 mt-1">
              Stage: <span className="text-zinc-300">{activeSimulation.currentStage.replace(/_/g, " ")}</span>
              <span className="mx-2 text-zinc-600">·</span>
              Elapsed: <span className="text-amber-400">{elapsed(activeSimulation.startedAt)}</span>
            </p>
          </div>
          <Link href={`/simulation/${activeSimulation.id}`}
            className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition">
            Resume Incident →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Launch Next Mission</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {SCENARIOS.map((s) => (
              <div key={s.id} className="rounded-lg border border-white/8 bg-zinc-950 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-500 uppercase tracking-wider">{s.industry}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${diffBadge(s.difficulty)}`}>{s.difficulty}</span>
                </div>
                <p className="font-semibold text-zinc-100">{s.name}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{s.brief}</p>
                <Link href={`/simulation/new?scenario=${s.id}`} className="mt-auto self-start rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition">
                  Deploy →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-5">Skill Path</p>
        <div className="flex items-start">
          {stages.map((st, i) => {
            const isCurrent = !st.done && (i === 0 || stages[i - 1].done);
            return (
              <div key={i} className="flex-1 flex flex-col items-center relative">
                {i < stages.length - 1 && <div className={`absolute top-3.5 left-1/2 w-full h-px ${st.done ? "bg-emerald-500/40" : "bg-zinc-800"}`} />}
                <div className={`relative z-10 h-7 w-7 rounded-full border-2 flex items-center justify-center mb-3 ${st.done ? "border-emerald-500 bg-emerald-500" : isCurrent ? "border-amber-400 bg-amber-400/10 animate-pulse" : "border-zinc-700 bg-zinc-900"}`}>
                  {st.done
                    ? <svg className="h-3.5 w-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <span className={`text-xs font-bold ${isCurrent ? "text-amber-400" : "text-zinc-600"}`}>{i + 1}</span>}
                </div>
                <p className={`text-xs font-semibold text-center leading-tight whitespace-pre-line px-1 ${st.done ? "text-emerald-400" : isCurrent ? "text-amber-400" : "text-zinc-600"}`}>{st.label}</p>
                <p className="text-xs text-zinc-600 text-center mt-0.5 px-1 leading-tight">{st.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Training Labs</h2>
          <Link href="/labs" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">Browse all →</Link>
        </div>
        {labs.length === 0
          ? <p className="text-zinc-500 text-sm">No labs published yet.</p>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {labs.map((lab) => {
                const solved = solvedIds.has(lab.id);
                const tasks = TASK_COUNTS[lab.slug] ?? 1;
                return (
                  <Link key={lab.id} href={`/labs/${lab.slug}`}
                    className={`rounded-xl border p-4 flex flex-col gap-2 transition ${solved ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/8 bg-zinc-900/50 hover:border-white/20"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-500 uppercase tracking-wider">{lab.type.replace("_", " ")}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${diffBadge(lab.difficulty)}`}>{lab.difficulty}</span>
                    </div>
                    <h3 className="font-semibold text-zinc-100">{lab.title}{solved && <span className="text-emerald-500 ml-1.5">✓</span>}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{lab.description}</p>
                    <p className="text-xs text-zinc-500 mt-auto pt-1">{tasks} task{tasks !== 1 ? "s" : ""} · {lab.points} pts</p>
                  </Link>
                );
              })}
            </div>}
      </section>

      <section className="pb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Recent Activity</h2>
        {attempts.length === 0
          ? <p className="text-zinc-500 text-sm">No attempts yet — pick a lab above.</p>
          : <div className="rounded-xl border border-white/8 divide-y divide-white/5 overflow-hidden">
              {attempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900/50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{a.lab.title}</p>
                    <p className="text-xs text-zinc-600">{a.startedAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border ${a.status === "SOLVED" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : a.status === "IN_PROGRESS" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-zinc-400 bg-zinc-800 border-zinc-700"}`}>
                      {a.status.replace("_", " ")}
                    </span>
                    {a.score > 0 && <span className="text-xs text-zinc-500">{a.score} pts</span>}
                  </div>
                </div>
              ))}
            </div>}
      </section>
    </main>
  );
}
