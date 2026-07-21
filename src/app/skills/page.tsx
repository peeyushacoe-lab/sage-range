import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skill Radar · Sage Vault" };

// ── Radar math (server-side, pure SVG) ───────────────────────────────────────

const CX = 200, CY = 200, R = 130;
const N = 6;

function angle(i: number) { return (i * 2 * Math.PI / N) - Math.PI / 2; }

function pt(i: number, scale: number): [number, number] {
  const a = angle(i);
  return [+(CX + scale * R * Math.cos(a)).toFixed(1) as unknown as number,
          +(CY + scale * R * Math.sin(a)).toFixed(1) as unknown as number];
}

function polygon(scales: number[]): string {
  return scales.map((s, i) => {
    const [x, y] = pt(i, Math.min(1, Math.max(0, s)));
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + " Z";
}

function labelAnchor(i: number): "middle" | "start" | "end" {
  const a = angle(i) % (2 * Math.PI);
  const deg = ((a * 180 / Math.PI) + 360) % 360;
  if (deg < 30 || deg > 330) return "middle";   // top
  if (deg > 150 && deg < 210) return "middle";   // bottom
  if (deg >= 30 && deg <= 150) return "start";   // right side
  return "end";                                  // left side
}

function labelBaseline(i: number): "auto" | "hanging" | "middle" {
  const a = angle(i);
  const deg = ((a * 180 / Math.PI) + 360) % 360;
  if (deg < 30 || deg > 330) return "auto";
  if (deg > 150 && deg < 210) return "hanging";
  return "middle";
}

// ── Skill score computation ───────────────────────────────────────────────────

const DIFF_PTS: Record<string, number> = { EASY: 8, MEDIUM: 20, HARD: 42, INSANE: 70 };

const FAST_THRESHOLDS: Record<string, number> = {
  EASY: 1800, MEDIUM: 3600, HARD: 7200, INSANE: 14400,
};

export default async function SkillsPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const [attempts, simSessions] = await Promise.all([
    db.attempt.findMany({
      where: { userId: me.id },
      include: { lab: { select: { type: true, difficulty: true } } },
    }),
    db.simulationSession.findMany({
      where: { userId: me.id, status: { in: ["CONTAINED", "BREACHED"] } },
      select: { status: true, score: true },
    }),
  ]);

  const solved = attempts.filter((a) => a.status === "SOLVED");

  // 6 skill dimensions
  const ctfSolved = solved.filter((a) => a.lab.type === "CTF");
  const blueSolved = solved.filter((a) => a.lab.type === "BLUE_TEAM");
  const redSolved  = solved.filter((a) => a.lab.type === "RED_TEAM");

  const ctfScore = Math.min(100, ctfSolved.reduce((s, a) => s + (DIFF_PTS[a.lab.difficulty] ?? 0), 0));
  const blueScore = Math.min(100,
    blueSolved.reduce((s, a) => s + (DIFF_PTS[a.lab.difficulty] ?? 0), 0) * 0.75 +
    simSessions.filter((s) => s.status === "CONTAINED").length * 6
  );
  const redScore = Math.min(100, redSolved.reduce((s, a) => s + (DIFF_PTS[a.lab.difficulty] ?? 0), 0));

  const avgSimScore = simSessions.length
    ? Math.round(simSessions.reduce((s, x) => s + (x.score ?? 0), 0) / simSessions.length)
    : 0;

  const timedSolves = solved.filter((a) => a.timeTakenSec != null);
  const fastSolves = timedSolves.filter((a) => {
    const threshold = FAST_THRESHOLDS[a.lab.difficulty];
    return threshold && a.timeTakenSec! < threshold;
  });
  const speedScore = timedSolves.length > 0
    ? Math.round((fastSolves.length / timedSolves.length) * 100)
    : 0;

  const hardSolved = solved.filter((a) => a.lab.difficulty === "HARD").length;
  const insaneSolved = solved.filter((a) => a.lab.difficulty === "INSANE").length;
  const depthScore = Math.min(100, hardSolved * 12 + insaneSolved * 28);

  const SKILLS = [
    { label: "CTF Mastery",   score: ctfScore,    color: "#22c55e", note: `${ctfSolved.length} CTF labs solved` },
    { label: "Blue Team",     score: blueScore,   color: "#3b82f6", note: `${blueSolved.length} defensive labs` },
    { label: "Red Team",      score: redScore,    color: "#ef4444", note: `${redSolved.length} offensive labs` },
    { label: "Simulation",    score: avgSimScore, color: "#a855f7", note: `Avg score ${avgSimScore}/100` },
    { label: "Speed",         score: speedScore,  color: "#f59e0b", note: `${fastSolves.length}/${timedSolves.length} fast solves` },
    { label: "Depth",         score: depthScore,  color: "#ec4899", note: `${hardSolved} Hard + ${insaneSolved} Insane` },
  ];

  const overallScore = Math.round(SKILLS.reduce((s, k) => s + k.score, 0) / SKILLS.length);

  // Grid polygon for axis lines
  const gridPcts = [0.25, 0.5, 0.75, 1.0];
  const skillScales = SKILLS.map((s) => s.score / 100);

  // Label positions
  const labelDist = R + 26;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Skill Analysis</p>
            <h1 className="text-2xl font-bold">Skill Radar</h1>
            <p className="text-sm text-zinc-500 mt-1">Your capability profile across 6 core dimensions</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums">{overallScore}</p>
            <p className="text-xs text-zinc-500 mt-0.5">overall skill index</p>
          </div>
        </div>

        {/* Radar + breakdown side by side */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">

          {/* SVG Radar chart */}
          <div className="md:col-span-3 rounded-xl border border-white/8 bg-zinc-900/50 p-4 flex justify-center">
            <svg viewBox="0 0 400 400" className="w-full max-w-[380px]" aria-label="Skill radar chart">
              {/* Grid polygons */}
              {gridPcts.map((pct) => (
                <path
                  key={pct}
                  d={polygon(Array(N).fill(pct))}
                  fill="none"
                  stroke="#3f3f46"
                  strokeWidth={pct === 1 ? 1.5 : 1}
                  strokeDasharray={pct === 1 ? undefined : "4 3"}
                />
              ))}

              {/* Grid labels at 25/50/75/100 on first axis */}
              {gridPcts.map((pct) => {
                const [x, y] = pt(0, pct);
                return (
                  <text key={pct} x={x - 6} y={y + 1} fontSize="8" fill="#52525b" textAnchor="end" dominantBaseline="middle">
                    {pct * 100}
                  </text>
                );
              })}

              {/* Axis lines */}
              {Array.from({ length: N }, (_, i) => {
                const [x, y] = pt(i, 1);
                return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#3f3f46" strokeWidth="1" />;
              })}

              {/* Skill polygon (filled area) */}
              <path
                d={polygon(skillScales)}
                fill="rgba(34, 197, 94, 0.08)"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Score dots */}
              {SKILLS.map((skill, i) => {
                const [x, y] = pt(i, skill.score / 100);
                return (
                  <circle key={i} cx={x} cy={y} r="4" fill={skill.color} stroke="#09090b" strokeWidth="1.5" />
                );
              })}

              {/* Axis labels */}
              {SKILLS.map((skill, i) => {
                const a = angle(i);
                const lx = +(CX + labelDist * Math.cos(a)).toFixed(1);
                const ly = +(CY + labelDist * Math.sin(a)).toFixed(1);
                return (
                  <text
                    key={i}
                    x={lx}
                    y={ly}
                    fontSize="11"
                    fontWeight="600"
                    fill={skill.color}
                    textAnchor={labelAnchor(i)}
                    dominantBaseline={labelBaseline(i)}
                  >
                    {skill.label}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Skill breakdown cards */}
          <div className="md:col-span-2 space-y-3">
            {SKILLS.map((skill) => (
              <div key={skill.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-zinc-200">{skill.label}</p>
                  <span className="text-lg font-black tabular-nums" style={{ color: skill.color }}>
                    {skill.score}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 mb-1.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${skill.score}%`, backgroundColor: skill.color }}
                  />
                </div>
                <p className="text-[10px] text-zinc-600">{skill.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How scores are computed */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">How Scores Are Computed</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-zinc-500">
            <p><span className="text-emerald-400 font-semibold">CTF Mastery</span> — difficulty-weighted CTF lab solves</p>
            <p><span className="text-blue-400 font-semibold">Blue Team</span> — defensive labs + threat containment rate</p>
            <p><span className="text-red-400 font-semibold">Red Team</span> — offensive lab solve progression</p>
            <p><span className="text-purple-400 font-semibold">Simulation</span> — average score across completed scenarios</p>
            <p><span className="text-amber-400 font-semibold">Speed</span> — percentage of labs solved under expected time</p>
            <p><span className="text-pink-400 font-semibold">Depth</span> — Hard and Insane difficulty achievements</p>
          </div>
        </div>

      </main>
    </div>
  );
}
