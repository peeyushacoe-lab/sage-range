import Link from "next/link";
import { db } from "@/lib/db";
import type { AppUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import { Badge, Button, StatCard, Table, TableScroll, THead, TBody, TR, TH, TD } from "@/components/ui";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

// A quality tier, not a severity — higher is better, so it never touches the
// danger/critical hues (those mean "bad" everywhere else in the app).
const RATING_TONE = {
  EXCEPTIONAL: "ok",
  STRONG: "info",
  ADEQUATE: "warn",
  DEVELOPING: "neutral",
} as const;

export async function InstructorHome({ user }: { user: AppUser }) {
  const classrooms = await db.classroom.findMany({
    where: { instructorId: user.id },
    include: {
      _count: { select: { enrollments: true, assignments: true } },
      enrollments: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const studentIds = [...new Set(classrooms.flatMap((c) => c.enrollments.map((e) => e.userId)))];

  const [labProgress, simSessions, totalAssignments] = await Promise.all([
    studentIds.length > 0
      ? db.labResponse.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? db.simulationSession.findMany({
          where: { userId: { in: studentIds }, status: { in: ["CONTAINED", "BREACHED"] } },
          select: { userId: true, score: true },
          orderBy: { score: "desc" },
        })
      : Promise.resolve([]),
    db.classroomLabAssignment.count({ where: { classroomId: { in: classrooms.map((c) => c.id) } } }),
  ]);

  const simByUser = new Map<string, number>();
  for (const s of (simSessions as { userId: string; score: number | null }[])) {
    const sc = s.score ?? 0;
    if (sc > (simByUser.get(s.userId) ?? 0)) simByUser.set(s.userId, sc);
  }

  const simCompletedCount = simByUser.size;

  // Top sim performers from enrolled students
  const topPerformers = [...simByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Get names for top performers
  const topIds = topPerformers.map(([id]) => id);
  const topUsers = topIds.length > 0
    ? await db.user.findMany({ where: { id: { in: topIds } }, select: { id: true, displayName: true, email: true } })
    : [];
  const topUserMap = new Map(topUsers.map((u) => [u.id, u]));

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-0.5 font-mono text-xs uppercase tracking-[0.14em] text-ink-3">Instructor Hub</p>
          <h1 className="text-2xl font-medium text-ink">{user.displayName ?? user.email.split("@")[0]}</h1>
          <p className="mt-1 text-sm text-ink-2">Manage classrooms, track student progress, and run exercises.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/mentor"><Button variant="secondary">Review Queue →</Button></Link>
          <Link href="/classroom"><Button variant="primary">Open Classroom Hub →</Button></Link>
        </div>
      </div>

      {/* Stats — four counts, no shared meaning, so none of them borrow status colour */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Classrooms" value={classrooms.length} />
        <StatCard label="Total students" value={studentIds.length} />
        <StatCard label="Lab assignments" value={totalAssignments} />
        <StatCard label="Completed sims" value={simCompletedCount} />
      </div>

      {/* Classrooms */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">My classrooms</h2>
          <Link href="/classroom" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">Manage all →</Link>
        </div>
        {classrooms.length === 0 ? (
          <div className="rounded-lg border border-edge bg-surface-1 p-8 text-center">
            <p className="mb-3 text-sm text-ink-3">No classrooms yet.</p>
            <Link href="/classroom" className="text-xs text-accent hover:underline">Create your first classroom →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((c) => (
              <Link
                key={c.id}
                href={`/classroom/${c.id}`}
                className="block rounded-lg border border-edge bg-surface-1 p-4 transition-colors duration-fast hover:border-edge-strong hover:bg-surface-2"
              >
                <p className="mb-1 text-sm font-medium text-ink">{c.name}</p>
                <p className="mb-3 font-mono text-xs text-ink-3">Code: {c.joinCode}</p>
                <div className="flex gap-4 text-xs text-ink-3">
                  <span><span className="font-medium text-ink-2">{c._count.enrollments}</span> students</span>
                  <span><span className="font-medium text-ink-2">{c._count.assignments}</span> labs</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top simulation performers */}
      <section className="pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">Top simulation performers</h2>
          {classrooms.length > 0 && (
            <Link href={`/classroom/${classrooms[0].id}/report`} className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">Full report →</Link>
          )}
        </div>
        {topPerformers.length === 0 ? (
          <div className="rounded-lg border border-edge bg-surface-1 p-6 text-center">
            <p className="text-sm text-ink-3">No students have completed a simulation yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-edge">
            <TableScroll>
              <Table>
                <THead>
                  <TR>
                    <TH>Rank</TH>
                    <TH>Student</TH>
                    <TH align="right">Assessment</TH>
                    <TH align="right">Best score</TH>
                  </TR>
                </THead>
                <TBody>
                  {topPerformers.map(([userId, score], idx) => {
                    const u = topUserMap.get(userId);
                    const rating = toRating(score);
                    return (
                      <TR key={userId}>
                        <TD numeric>{idx + 1}</TD>
                        <TD className="font-medium text-ink">{u?.displayName ?? u?.email.split("@")[0] ?? userId}</TD>
                        <TD align="right"><Badge tone={RATING_TONE[rating]}>{rating}</Badge></TD>
                        <TD align="right" numeric className="font-medium text-ok">{score}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableScroll>
          </div>
        )}
      </section>
    </main>
  );
}
