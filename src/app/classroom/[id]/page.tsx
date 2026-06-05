import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import { AssignLabsClient } from "./_components/assign-labs-client";
import { CsvImportClient } from "./_components/csv-import-client";
import { AnnouncementClient } from "./_components/announcement-client";
import { AssignScenarioClient } from "./_components/assign-scenario-client";
import { CopyCodeBtn } from "./_components/copy-code-btn";
import { Navbar } from "@/components/navbar";
import { listScenarios } from "@/lib/simulation/runtime/scenarios/manifest";

export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-sage-500", MEDIUM: "text-amber-400",
  HARD: "text-orange-400", INSANE: "text-red-400",
};

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_STYLE: Record<string, string> = {
  EXCEPTIONAL: "text-sage-400 border-sage-500/30 bg-sage-500/8",
  STRONG:      "text-blue-400 border-blue-500/30 bg-blue-500/8",
  ADEQUATE:    "text-amber-400 border-amber-500/30 bg-amber-500/8",
  DEVELOPING:  "text-zinc-500 border-zinc-700",
};

function formatDue(date: Date): { label: string; pastDue: boolean } {
  const pastDue = date < new Date();
  return { label: (pastDue ? "Past due " : "Due ") + date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), pastDue };
}

export default async function ClassroomDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const classroom = await db.classroom.findUnique({
    where: { id },
    include: {
      assignments: { include: { lab: true }, orderBy: { assignedAt: "asc" } },
      announcements: { orderBy: { createdAt: "desc" }, take: 20 },
      simAssignments: { orderBy: { assignedAt: "desc" } },
    },
  });
  if (!classroom) notFound();

  const isInstructor = (user.role === "INSTRUCTOR" || user.role === "ADMIN") && classroom.instructorId === user.id;
  const isEnrolled = !isInstructor && await db.classroomEnrollment.findUnique({
    where: { classroomId_userId: { classroomId: id, userId: user.id } },
  });
  if (!isInstructor && !isEnrolled) redirect("/classroom");

  const assignedLabs = classroom.assignments.map((a) => a.lab);
  const assignedIds = assignedLabs.map((l) => l.id);
  const dueDates: Record<string, string | null> = {};
  for (const a of classroom.assignments) dueDates[a.labId] = a.dueDate?.toISOString() ?? null;

  // ── INSTRUCTOR VIEW ──────────────────────────────────────────────────────────
  if (isInstructor) {
    const [allLabs, enrollments] = await Promise.all([
      db.lab.findMany({ where: { published: true }, orderBy: [{ type: "asc" }, { difficulty: "asc" }] }),
      db.classroomEnrollment.findMany({
        where: { classroomId: id },
        include: { user: { select: { id: true, displayName: true, email: true, skillScore: true } } },
        orderBy: { enrolledAt: "asc" },
      }),
    ]);

    const studentIds = enrollments.map((e) => e.userId);

    const [labResponses, simSessions, activeSims] = await Promise.all([
      studentIds.length > 0
        ? db.labResponse.findMany({ where: { userId: { in: studentIds }, labId: { in: assignedIds } }, select: { userId: true, labId: true, stage: true } })
        : Promise.resolve([]),
      studentIds.length > 0
        ? db.simulationSession.findMany({ where: { userId: { in: studentIds }, status: { in: ["CONTAINED", "BREACHED"] } }, select: { userId: true, score: true } })
        : Promise.resolve([]),
      studentIds.length > 0
        ? db.simulationSession.findMany({ where: { userId: { in: studentIds }, status: "ACTIVE" }, select: { userId: true, id: true }, orderBy: { startedAt: "desc" } })
        : Promise.resolve([]),
    ]);

    const progress = new Map<string, Map<string, Set<string>>>();
    for (const r of labResponses) {
      if (!progress.has(r.userId)) progress.set(r.userId, new Map());
      const byLab = progress.get(r.userId)!;
      if (!byLab.has(r.labId)) byLab.set(r.labId, new Set());
      byLab.get(r.labId)!.add(r.stage);
    }

    const bestSim = new Map<string, number>();
    for (const s of simSessions) {
      if (s.score > (bestSim.get(s.userId) ?? 0)) bestSim.set(s.userId, s.score);
    }
    const activeSimByUser = new Map(activeSims.map((s) => [s.userId, s.id]));

    const simCount = bestSim.size;
    const avgScore = simCount > 0 ? Math.round([...bestSim.values()].reduce((a, b) => a + b, 0) / simCount) : null;
    const allScores = enrollments.map((e) => e.user.skillScore).filter((s) => s > 0);
    const avgSkill = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

    const scenarios = listScenarios();
    const assignedSimIds = new Set(classroom.simAssignments.map((s) => s.scenarioId));
    const initialAssigned = classroom.simAssignments.map((s) => ({
      scenarioId: s.scenarioId, title: s.title, dueDate: s.dueDate?.toISOString() ?? null,
    }));
    const annInitial = classroom.announcements.map((a) => ({
      id: a.id, content: a.content, createdAt: a.createdAt.toISOString(),
    }));

    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <Navbar backHref="/classroom" backLabel="Classrooms" />

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

          {/* Header */}
          <header className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{classroom.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-zinc-500">Join code</span>
                <CopyCodeBtn code={classroom.joinCode} />
                <span className="text-xs text-zinc-600">{enrollments.length} student{enrollments.length !== 1 ? "s" : ""} enrolled</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/classroom/${id}/report`}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition">
                Full Report →
              </Link>
            </div>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Enrolled", value: enrollments.length, color: "text-zinc-100" },
              { label: "Labs Assigned", value: assignedLabs.length, color: "text-sage-400" },
              { label: "Sims Completed", value: simCount, color: "text-blue-400" },
              { label: avgScore !== null ? `Avg Sim Score` : "Avg Skill Score", value: avgScore ?? avgSkill ?? "—", color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Announcements */}
          <section>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              Announcements
              <span className="text-xs font-normal text-zinc-500">Visible to all enrolled students</span>
            </h2>
            <AnnouncementClient classroomId={id} initial={annInitial} />
          </section>

          {/* Assign Labs */}
          <section>
            <h2 className="text-base font-semibold mb-3">Assign Labs</h2>
            <AssignLabsClient classroomId={id} allLabs={allLabs} assignedIds={assignedIds} dueDates={dueDates} />
          </section>

          {/* Assign Simulation Scenarios */}
          <section>
            <h2 className="text-base font-semibold mb-1">Assign Simulation Scenarios</h2>
            <p className="text-xs text-zinc-500 mb-4">Students will see these on their classroom page with a direct launch link.</p>
            <AssignScenarioClient
              classroomId={id}
              scenarios={scenarios.map((s) => ({
                id: s.id, title: s.title, subtitle: s.subtitle,
                difficulty: s.difficulty, estimatedMinutes: s.estimatedMinutes, personaId: s.personaId,
              }))}
              initialAssigned={initialAssigned}
            />
          </section>

          {/* Student Progress */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Student Progress</h2>
              <CsvImportClient classroomId={id} />
            </div>
            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-white/8 p-10 text-center">
                <p className="text-zinc-500 text-sm">No students enrolled yet.</p>
                <p className="text-xs text-zinc-600 mt-2">Share code <span className="font-mono text-sage-400">{classroom.joinCode}</span> with your class.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/8">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="border-b border-white/8 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-900/50">
                      <th className="text-left p-3 pl-4">Student</th>
                      {assignedLabs.map((lab) => {
                        const due = dueDates[lab.id] ? formatDue(new Date(dueDates[lab.id]!)) : null;
                        return (
                          <th key={lab.id} className="text-center p-3 min-w-[80px]">
                            <span className="block truncate max-w-[75px] mx-auto text-zinc-400" title={lab.title}>{lab.title}</span>
                            <span className={`block text-[10px] font-normal ${DIFF_COLORS[lab.difficulty]}`}>{lab.difficulty}</span>
                            {due && <span className={`block text-[10px] font-normal mt-0.5 ${due.pastDue ? "text-red-400" : "text-zinc-600"}`}>{due.label}</span>}
                          </th>
                        );
                      })}
                      <th className="text-center p-3 min-w-[110px]">Simulation</th>
                      <th className="text-right p-3 pr-4">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {enrollments
                      .sort((a, b) => (b.user.skillScore ?? 0) - (a.user.skillScore ?? 0))
                      .map(({ user: student }) => {
                        const sp = progress.get(student.id);
                        const simScore = bestSim.get(student.id);
                        const rating = simScore !== undefined ? toRating(simScore) : null;
                        const activeId = activeSimByUser.get(student.id);

                        return (
                          <tr key={student.id} className="hover:bg-white/3 transition">
                            <td className="p-3 pl-4">
                              <Link href={`/profile/${student.id}`} className="hover:text-sage-400 transition">
                                <p className="font-medium">{student.displayName ?? student.email.split("@")[0]}</p>
                                <p className="text-xs text-zinc-600">{student.email}</p>
                              </Link>
                              {activeId && (
                                <Link href={`/simulation/${activeId}/observe`} className="text-[10px] text-sage-400 flex items-center gap-1 mt-0.5 hover:underline">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse inline-block" />
                                  Live · Observe →
                                </Link>
                              )}
                            </td>
                            {assignedLabs.map((lab) => {
                              const stages = TASK_STAGES[lab.slug] ?? [];
                              const done = stages.filter((s) => sp?.get(lab.id)?.has(s)).length;
                              const total = stages.length;
                              const solved = done === total && total > 0;
                              return (
                                <td key={lab.id} className="p-3 text-center">
                                  {total === 0 ? <span className="text-zinc-700">—</span>
                                    : solved ? <span className="text-sage-400 font-semibold">✓</span>
                                    : done > 0 ? <span className="text-amber-400 font-mono text-xs">{done}/{total}</span>
                                    : <span className="text-zinc-700 text-xs">0/{total}</span>}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center">
                              {rating ? (
                                <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${RATING_STYLE[rating]}`}>{rating}</span>
                              ) : (
                                <span className="text-zinc-700 text-xs">—</span>
                              )}
                            </td>
                            <td className="p-3 pr-4 text-right font-semibold">
                              {student.skillScore > 0 ? student.skillScore : <span className="text-zinc-700">0</span>}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>
    );
  }

  // ── STUDENT VIEW ─────────────────────────────────────────────────────────────
  const labResponses = assignedIds.length > 0
    ? await db.labResponse.findMany({ where: { userId: user.id, labId: { in: assignedIds } }, select: { labId: true, stage: true } })
    : [];

  const completedByLab = new Map<string, Set<string>>();
  for (const r of labResponses) {
    if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
    completedByLab.get(r.labId)!.add(r.stage);
  }

  const scenarios = listScenarios();
  const assignedScenarios = classroom.simAssignments
    .map((a) => scenarios.find((s) => s.id === a.scenarioId))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const annList = classroom.announcements.map((a) => ({
    id: a.id, content: a.content, createdAt: a.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/classroom" backLabel="Classrooms" />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">{classroom.name}</h1>
          <p className="text-sm text-zinc-400 mt-1">Your instructor's assignments and announcements.</p>
        </header>

        {/* Announcements */}
        {annList.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Announcements</h2>
            <div className="space-y-2">
              {annList.map((a) => (
                <div key={a.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                  <p className="text-sm text-zinc-200 leading-relaxed">{a.content}</p>
                  <p className="text-xs text-zinc-600 mt-1">{new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assigned Simulations */}
        {assignedScenarios.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Simulation Exercises</h2>
            <div className="space-y-3">
              {assignedScenarios.map((s) => (
                <div key={s.id} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.subtitle} · {s.difficulty} · {s.estimatedMinutes} min</p>
                  </div>
                  <Link
                    href={`/simulation/new?scenario=${s.id}`}
                    className="shrink-0 text-xs font-bold rounded-lg bg-sage-500 px-3 py-1.5 text-black hover:bg-sage-400 transition"
                  >
                    Launch →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assigned Labs */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Assigned Labs</h2>
          {assignedLabs.length === 0 ? (
            <p className="text-zinc-500 text-sm">No labs assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {assignedLabs.map((lab) => {
                const stages = TASK_STAGES[lab.slug] ?? [];
                const done = stages.filter((s) => completedByLab.get(lab.id)?.has(s)).length;
                const total = stages.length;
                const solved = done === total && total > 0;
                const dueIso = dueDates[lab.id];
                const due = dueIso ? formatDue(new Date(dueIso)) : null;

                return (
                  <Link key={lab.id} href={`/labs/${lab.slug}`}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition ${
                      solved ? "border-sage-500/40 bg-sage-500/5 hover:bg-sage-500/8" : "border-white/8 hover:border-sage-500/30 hover:bg-white/3"
                    }`}>
                    <div className="min-w-0">
                      <p className="font-semibold flex items-center gap-2">
                        {lab.title}{solved && <span className="text-sage-500 text-sm">✓</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{lab.category} · <span className={DIFF_COLORS[lab.difficulty]}>{lab.difficulty}</span></p>
                      {due && <p className={`text-xs mt-0.5 ${due.pastDue ? "text-red-400" : "text-zinc-600"}`}>{due.label}</p>}
                      {total > 0 && done > 0 && !solved && (
                        <div className="flex gap-0.5 mt-1.5 max-w-[100px]">
                          {stages.map((s) => (
                            <div key={s} className={`flex-1 h-1 rounded-full ${completedByLab.get(lab.id)?.has(s) ? "bg-sage-500" : "bg-zinc-800"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-mono ${solved ? "text-sage-400" : done > 0 ? "text-amber-400" : "text-zinc-600"}`}>{done}/{total}</span>
                      <p className="text-xs text-zinc-600">{lab.points} pts</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
