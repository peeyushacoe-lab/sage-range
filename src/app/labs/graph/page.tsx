import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { TASK_STAGES } from "../[slug]/_content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skill Graph · Sage Vault" };

const DIFF_BG: Record<string, string> = {
  EASY:   "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  MEDIUM: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  HARD:   "bg-orange-500/10 border-orange-500/30 text-orange-400",
  INSANE: "bg-red-500/10 border-red-500/30 text-red-400",
};

const DIFF_DOT: Record<string, string> = {
  EASY:   "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HARD:   "bg-orange-500",
  INSANE: "bg-red-500",
};

const TYPE_ICON: Record<string, string> = {
  CTF:       "🚩",
  BLUE_TEAM: "🛡️",
  RED_TEAM:  "⚔️",
};

function difficultyOrder(d: string) {
  return { EASY: 0, MEDIUM: 1, HARD: 2, INSANE: 3 }[d] ?? 0;
}

export default async function LabGraphPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [paths, allLabs, attempts, labResponses] = await Promise.all([
    db.learningPath.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      include: {
        labs: {
          include: { lab: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.lab.findMany({
      where: { published: true },
      orderBy: [{ difficulty: "asc" }, { title: "asc" }],
    }),
    db.attempt.findMany({ where: { userId: user.id }, select: { labId: true, status: true } }),
    db.labResponse.findMany({ where: { userId: user.id }, select: { labId: true, stage: true } }),
  ]);

  const statusByLab = new Map(attempts.map((a) => [a.labId, a.status]));

  const completedByLab = new Map<string, Set<string>>();
  for (const r of labResponses) {
    if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
    completedByLab.get(r.labId)!.add(r.stage);
  }

  function labCompletion(labId: string, slug: string): "done" | "partial" | "none" {
    const stages = TASK_STAGES[slug] ?? [];
    if (stages.length === 0) return statusByLab.get(labId) === "SOLVED" ? "done" : "none";
    const done = completedByLab.get(labId);
    if (!done || done.size === 0) return "none";
    return stages.every((s) => done.has(s)) ? "done" : "partial";
  }

  const pathLabIds = new Set(paths.flatMap((p) => p.labs.map((pl) => pl.labId)));
  const standaloneLabs = allLabs.filter((l) => !pathLabIds.has(l.id));

  // Group standalone labs by type
  const grouped = new Map<string, typeof standaloneLabs>();
  for (const lab of standaloneLabs) {
    if (!grouped.has(lab.type)) grouped.set(lab.type, []);
    grouped.get(lab.type)!.push(lab);
  }

  const totalLabs = allLabs.length;
  const doneLabs = allLabs.filter((l) => labCompletion(l.id, l.slug) === "done").length;
  const partialLabs = allLabs.filter((l) => labCompletion(l.id, l.slug) === "partial").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <Link href="/labs" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-2 block">← All Labs</Link>
            <h1 className="text-2xl font-bold">Skill Graph</h1>
            <p className="text-zinc-500 text-sm mt-1">Visual map of learning paths and standalone labs</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xl font-bold">{doneLabs}</p>
              <p className="text-xs text-zinc-600">completed</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-amber-400">{partialLabs}</p>
              <p className="text-xs text-zinc-600">in progress</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-zinc-600">{totalLabs - doneLabs - partialLabs}</p>
              <p className="text-xs text-zinc-600">not started</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Completed</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />In Progress</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />Not Started</div>
          <span className="text-zinc-700">·</span>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 inline-block" />Easy</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/40 inline-block" />Medium</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500/40 inline-block" />Hard</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/40 inline-block" />Insane</div>
        </div>

        {/* Learning Paths */}
        {paths.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Learning Paths</h2>
            <div className="space-y-6">
              {paths.map((path) => {
                const pathLabs = path.labs.sort((a, b) => a.order - b.order);
                const pathDone = pathLabs.filter((pl) => labCompletion(pl.labId, pl.lab.slug) === "done").length;
                const pathTotal = pathLabs.length;
                const pct = pathTotal > 0 ? Math.round((pathDone / pathTotal) * 100) : 0;

                return (
                  <div key={path.id} className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
                    {/* Path header */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base">🗺️</span>
                        <div className="min-w-0">
                          <Link href={`/paths/${path.slug}`} className="font-semibold text-sm hover:text-sage-400 transition truncate block">
                            {path.title}
                          </Link>
                          <p className="text-xs text-zinc-600">{pathDone}/{pathTotal} complete</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-sage-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-zinc-600 w-8 text-right">{pct}%</span>
                      </div>
                    </div>

                    {/* Node flow */}
                    <div className="overflow-x-auto pb-2">
                      <div className="flex items-center gap-0 min-w-max">
                        {pathLabs.map((pl, idx) => {
                          const state = labCompletion(pl.labId, pl.lab.slug);
                          const diff = pl.lab.difficulty;
                          const isLast = idx === pathLabs.length - 1;

                          const nodeBase = "relative rounded-lg border px-3 py-2.5 w-36 shrink-0 transition hover:scale-105";
                          const nodeCls =
                            state === "done"
                              ? `${nodeBase} border-emerald-500/40 bg-emerald-500/6`
                              : state === "partial"
                              ? `${nodeBase} border-amber-500/40 bg-amber-500/6`
                              : `${nodeBase} border-white/8 bg-zinc-900/40`;

                          return (
                            <div key={pl.id} className="flex items-center">
                              <Link href={`/labs/${pl.lab.slug}`} className={nodeCls}>
                                {/* Status dot */}
                                <div
                                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                                    state === "done"
                                      ? "bg-emerald-500"
                                      : state === "partial"
                                      ? "bg-amber-500"
                                      : "bg-zinc-700"
                                  }`}
                                />
                                <p className="text-[10px] text-zinc-500 mb-1">{TYPE_ICON[pl.lab.type]} {idx + 1}</p>
                                <p className="text-xs font-medium leading-tight text-zinc-200 line-clamp-2">
                                  {pl.lab.title}
                                </p>
                                <div className={`mt-2 inline-flex items-center gap-1 text-[10px] border rounded-full px-1.5 py-0.5 ${DIFF_BG[diff] ?? "border-zinc-700 text-zinc-500"}`}>
                                  <span className={`w-1 h-1 rounded-full inline-block ${DIFF_DOT[diff] ?? "bg-zinc-600"}`} />
                                  {diff.charAt(0) + diff.slice(1).toLowerCase()}
                                </div>
                              </Link>
                              {!isLast && (
                                <div className="flex items-center px-1">
                                  <svg width="24" height="16" viewBox="0 0 24 16" className="text-zinc-700 shrink-0">
                                    <path d="M0 8 H20 M16 4 L20 8 L16 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Standalone labs by type */}
        {grouped.size > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Standalone Labs</h2>
            <div className="space-y-8">
              {(["CTF", "BLUE_TEAM", "RED_TEAM"] as const).map((labType) => {
                const typeLabs = grouped.get(labType);
                if (!typeLabs || typeLabs.length === 0) return null;

                const sorted = [...typeLabs].sort((a, b) => difficultyOrder(a.difficulty) - difficultyOrder(b.difficulty));
                const typeDone = sorted.filter((l) => labCompletion(l.id, l.slug) === "done").length;

                const typeLabels: Record<string, string> = {
                  CTF: "Capture The Flag",
                  BLUE_TEAM: "Blue Team",
                  RED_TEAM: "Red Team",
                };

                return (
                  <div key={labType}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-base">{TYPE_ICON[labType]}</span>
                      <h3 className="text-sm font-semibold text-zinc-300">{typeLabels[labType]}</h3>
                      <span className="text-xs text-zinc-700">{typeDone}/{sorted.length} complete</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {sorted.map((lab) => {
                        const state = labCompletion(lab.id, lab.slug);
                        const diff = lab.difficulty;
                        const nodeCls = `rounded-lg border px-3 py-2.5 transition hover:scale-105 ${
                          state === "done"
                            ? "border-emerald-500/40 bg-emerald-500/6"
                            : state === "partial"
                            ? "border-amber-500/40 bg-amber-500/6"
                            : "border-white/8 bg-zinc-900/40"
                        }`;
                        return (
                          <Link key={lab.id} href={`/labs/${lab.slug}`} className={nodeCls}>
                            <div className="flex items-start justify-between mb-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                state === "done" ? "bg-emerald-500" : state === "partial" ? "bg-amber-500" : "bg-zinc-700"
                              }`} />
                              <span className={`text-[9px] border rounded-full px-1.5 py-0.5 ${DIFF_BG[diff] ?? "border-zinc-700 text-zinc-500"}`}>
                                {diff.charAt(0)}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium leading-tight text-zinc-300 line-clamp-2">{lab.title}</p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {allLabs.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-4xl mb-4">🗺️</p>
            <p>No labs published yet.</p>
          </div>
        )}

      </div>
    </div>
  );
}
