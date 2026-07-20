import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import { PrintBtn } from "./_components/print-btn";

export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-sage-500",
  MEDIUM: "text-amber-400",
  HARD: "text-orange-400",
  INSANE: "text-red-400",
};

function gradeColor(grade: string) {
  if (grade === "A") return "text-sage-400";
  if (grade === "B") return "text-emerald-400";
  if (grade === "C") return "text-amber-400";
  if (grade === "D") return "text-orange-400";
  return "text-red-400";
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export default async function ClassroomReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const classroom = await db.classroom.findUnique({
    where: { id },
    include: {
      assignments: { include: { lab: true }, orderBy: { assignedAt: "asc" } },
    },
  });
  if (!classroom) notFound();

  const isInstructor =
    (user.role === "INSTRUCTOR" || user.role === "ADMIN") &&
    classroom.instructorId === user.id;
  if (!isInstructor) redirect(`/classroom/${id}`);

  const assignedLabs = classroom.assignments.map((a) => a.lab);
  const assignedIds = assignedLabs.map((l) => l.id);

  const enrollments = await db.classroomEnrollment.findMany({
    where: { classroomId: id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          university: true,
          skillScore: true,
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });

  const studentIds = enrollments.map((e) => e.userId);

  const [labResponses, simSessions] = await Promise.all([
    studentIds.length > 0
      ? db.labResponse.findMany({
          where: { userId: { in: studentIds }, labId: { in: assignedIds } },
          select: { userId: true, labId: true, stage: true },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? db.simulationSession.findMany({
          where: {
            userId: { in: studentIds },
            status: { in: ["CONTAINED", "BREACHED"] },
          },
          select: { userId: true, score: true },
          orderBy: { endedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Per student: completed stages per lab
  const progress = new Map<string, Map<string, Set<string>>>();
  for (const r of labResponses) {
    if (!progress.has(r.userId)) progress.set(r.userId, new Map());
    const byLab = progress.get(r.userId)!;
    if (!byLab.has(r.labId)) byLab.set(r.labId, new Set());
    byLab.get(r.labId)!.add(r.stage);
  }

  // Best sim score per student
  const bestSim = new Map<string, number>();
  for (const s of simSessions) {
    const cur = bestSim.get(s.userId) ?? 0;
    if (s.score > cur) bestSim.set(s.userId, s.score);
  }

  // Simulation analytics
  const studentsWithSim = enrollments.filter((e) => bestSim.has(e.userId));
  const simScoresList = studentsWithSim.map((e) => bestSim.get(e.userId)!);
  const avgSimScore = simScoresList.length > 0
    ? Math.round(simScoresList.reduce((a, b) => a + b, 0) / simScoresList.length)
    : null;

  function toRating(score: number) {
    if (score >= 88) return "EXCEPTIONAL";
    if (score >= 68) return "STRONG";
    if (score >= 48) return "ADEQUATE";
    return "DEVELOPING";
  }

  const ratingDist = { EXCEPTIONAL: 0, STRONG: 0, ADEQUATE: 0, DEVELOPING: 0 };
  for (const score of simScoresList) ratingDist[toRating(score) as keyof typeof ratingDist]++;

  const topPerformers = [...studentsWithSim]
    .sort((a, b) => (bestSim.get(b.userId) ?? 0) - (bestSim.get(a.userId) ?? 0))
    .slice(0, 5);

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          body { background: white !important; color: black !important; }
          table { border-collapse: collapse; }
          th, td { border: 1px solid #ccc; }
        }
      `}</style>

      <main className="min-h-screen bg-white text-zinc-900 print:bg-white">
        {/* Report Header */}
        <div className="border-b border-zinc-200 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-sage-700">Sage Vault</span>
            <span className="text-zinc-400">|</span>
            <span className="text-sm text-zinc-500">Class Progress Report</span>
          </div>
          <PrintBtn />
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          {/* Class info */}
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{classroom.name}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Generated: {generatedDate} &nbsp;&middot;&nbsp; {enrollments.length} student{enrollments.length !== 1 ? "s" : ""} &nbsp;&middot;&nbsp; {assignedLabs.length} lab{assignedLabs.length !== 1 ? "s" : ""} assigned
            </p>
          </div>

          {/* Progress Table */}
          {enrollments.length === 0 ? (
            <p className="text-zinc-500 text-sm">No students enrolled.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-50">
                    <th className="text-left p-3 pl-4">Student</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">University</th>
                    {assignedLabs.map((lab) => (
                      <th key={lab.id} className="text-center p-3 min-w-[80px]">
                        <span className="block truncate max-w-[70px] mx-auto" title={lab.title}>
                          {lab.title}
                        </span>
                        <span className={`text-[10px] font-normal ${DIFF_COLORS[lab.difficulty] ?? ""}`}>
                          {lab.difficulty}
                        </span>
                      </th>
                    ))}
                    <th className="text-center p-3">Best Sim</th>
                    <th className="text-right p-3 pr-4">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {enrollments.map(({ user: student }) => {
                    const studentProgress = progress.get(student.id);
                    const simScore = bestSim.get(student.id);
                    const simGrade = simScore !== undefined ? scoreToGrade(simScore) : null;

                    return (
                      <tr key={student.id} className="hover:bg-zinc-50">
                        <td className="p-3 pl-4 font-medium">
                          {student.displayName ?? student.email.split("@")[0]}
                        </td>
                        <td className="p-3 text-zinc-600 text-xs">{student.email}</td>
                        <td className="p-3 text-zinc-600 text-xs">{student.university ?? "—"}</td>
                        {assignedLabs.map((lab) => {
                          const stages = TASK_STAGES[lab.slug] ?? [];
                          const done = stages.filter(
                            (s) => studentProgress?.get(lab.id)?.has(s)
                          ).length;
                          const total = stages.length;
                          const solved = done === total && total > 0;
                          return (
                            <td key={lab.id} className="p-3 text-center">
                              {total === 0 ? (
                                <span className="text-zinc-400">—</span>
                              ) : solved ? (
                                <span className="text-sage-500 font-semibold">✓</span>
                              ) : done > 0 ? (
                                <span className="text-amber-500 font-mono text-xs">
                                  {done}/{total}
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-xs">0/{total}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          {simGrade ? (
                            <span className={`font-bold text-base ${gradeColor(simGrade)}`}>
                              {simGrade}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right font-semibold text-zinc-900">
                          {student.skillScore > 0 ? student.skillScore : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Simulation Analytics */}
          <div className="border-t border-zinc-200 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Simulation Analytics</h2>
            {studentsWithSim.length === 0 ? (
              <p className="text-sm text-zinc-400">No students have completed a simulation yet.</p>
            ) : (
              <div className="space-y-5">
                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs text-zinc-500 mb-0.5">Completed Sims</p>
                    <p className="text-2xl font-bold text-zinc-900">{studentsWithSim.length}<span className="text-sm font-normal text-zinc-400">/{enrollments.length}</span></p>
                  </div>
                  {avgSimScore !== null && (
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-xs text-zinc-500 mb-0.5">Avg Score</p>
                      <p className="text-2xl font-bold text-zinc-900">{avgSimScore}</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs text-zinc-500 mb-0.5">Top Quartile</p>
                    <p className="text-2xl font-bold text-zinc-900">
                      {simScoresList.length > 0
                        ? Math.round([...simScoresList].sort((a, b) => b - a)[Math.floor(simScoresList.length * 0.25)] ?? 0)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs text-zinc-500 mb-0.5">EXCEPTIONAL</p>
                    <p className="text-2xl font-bold text-sage-600">{ratingDist.EXCEPTIONAL}</p>
                  </div>
                </div>

                {/* Rating distribution */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Assessment Distribution</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["EXCEPTIONAL", "STRONG", "ADEQUATE", "DEVELOPING"] as const).map((r) => {
                      const pct = studentsWithSim.length > 0 ? Math.round((ratingDist[r] / studentsWithSim.length) * 100) : 0;
                      const colors = {
                        EXCEPTIONAL: "bg-sage-500",
                        STRONG:      "bg-blue-500",
                        ADEQUATE:    "bg-amber-500",
                        DEVELOPING:  "bg-zinc-400",
                      };
                      return (
                        <div key={r} className="text-center">
                          <div className="h-16 rounded bg-zinc-100 relative overflow-hidden mb-1">
                            <div className={`absolute bottom-0 w-full rounded ${colors[r]}`} style={{ height: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-zinc-500 font-medium">{r}</p>
                          <p className="text-sm font-bold text-zinc-700">{ratingDist[r]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top performers */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Top Performers</p>
                  <div className="space-y-1.5">
                    {topPerformers.map((e, idx) => {
                      const score = bestSim.get(e.userId)!;
                      const rating = toRating(score);
                      const ratingColors: Record<string, string> = {
                        EXCEPTIONAL: "text-sage-600",
                        STRONG: "text-blue-600",
                        ADEQUATE: "text-amber-600",
                        DEVELOPING: "text-zinc-500",
                      };
                      return (
                        <div key={e.userId} className="flex items-center justify-between text-sm rounded border border-zinc-100 px-3 py-2">
                          <span className="text-zinc-400 w-5">{idx + 1}</span>
                          <span className="flex-1 font-medium text-zinc-800">{e.user.displayName ?? e.user.email.split("@")[0]}</span>
                          <span className={`text-xs font-bold uppercase ${ratingColors[rating] ?? "text-zinc-500"}`}>{rating}</span>
                          <span className="ml-4 font-bold text-zinc-900 w-8 text-right">{score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
