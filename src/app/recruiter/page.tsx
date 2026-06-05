import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { RecruiterTabs, type StudentRow, type JobPostingRow, type SimGrade } from "./_components/recruiter-tabs";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

function computeSimGrade(bestScore: number): SimGrade {
  if (bestScore >= 90) return "A";
  if (bestScore >= 75) return "B";
  if (bestScore >= 60) return "C";
  if (bestScore >= 45) return "D";
  return "F";
}

export default async function RecruiterDashboard() {
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "RECRUITER" && me.role !== "ADMIN")) redirect("/dashboard");

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: [{ skillScore: "desc" }],
    take: 200,
    select: {
      id: true,
      displayName: true,
      email: true,
      university: true,
      skillScore: true,
      linkedIn: true,
      github: true,
      aiEvaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { recommendation: true },
      },
    },
  });

  const studentIds = students.map((s) => s.id);

  const [solvedCounts, simScores, pathProgress, bookmarks, jobPostings] = await Promise.all([
    db.attempt.groupBy({
      by: ["userId"],
      where: { userId: { in: studentIds }, status: "SOLVED" },
      _count: { id: true },
    }),
    db.simulationSession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: studentIds },
        status: { in: ["CONTAINED", "BREACHED"] },
      },
      _max: { score: true },
      _count: { id: true },
    }),
    db.userPathProgress.findMany({
      where: { userId: { in: studentIds }, completedAt: { not: null } },
      select: { userId: true, path: { select: { slug: true } } },
    }),
    db.candidateBookmark.findMany({
      where: { recruiterId: me.id },
      select: { candidateId: true },
    }),
    db.jobPosting.findMany({
      where: { recruiterId: me.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const solvedByUser = new Map(solvedCounts.map((r) => [r.userId, r._count.id]));
  const simByUser = new Map(
    simScores.map((r) => [r.userId, { best: r._max.score ?? 0, count: r._count.id }])
  );

  // Build path completion map: userId -> slug[]
  const pathsByUser = new Map<string, string[]>();
  for (const pp of pathProgress) {
    const existing = pathsByUser.get(pp.userId) ?? [];
    existing.push(pp.path.slug);
    pathsByUser.set(pp.userId, existing);
  }

  const bookmarkedIdsList = bookmarks.map((b) => b.candidateId);

  const studentRows: StudentRow[] = students.map((s) => {
    const sim = simByUser.get(s.id);
    const bestSimScore = sim?.best ?? 0;
    const eval_ = s.aiEvaluations[0];
    return {
      id: s.id,
      displayName: s.displayName,
      email: s.email,
      university: s.university,
      skillScore: s.skillScore,
      linkedIn: s.linkedIn,
      github: s.github,
      labsSolved: solvedByUser.get(s.id) ?? 0,
      bestSimScore,
      simGrade: computeSimGrade(bestSimScore),
      simCount: sim?.count ?? 0,
      aiRating: null,
      aiVerdict: eval_?.recommendation ?? null,
      completedPaths: pathsByUser.get(s.id) ?? [],
    };
  });

  const postingRows: JobPostingRow[] = jobPostings.map((p) => ({
    id: p.id,
    title: p.title,
    company: p.company,
    description: p.description,
    requirements: p.requirements as JobPostingRow["requirements"],
    active: p.active,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Sage Forge</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Recruiter Marketplace</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {studentRows.length} candidates available &middot; {bookmarkedIdsList.length} saved
          </p>
        </div>
      </header>

      <RecruiterTabs
        students={studentRows}
        bookmarkedIds={bookmarkedIdsList}
        jobPostings={postingRows}
      />
      </div>
    </main>
  );
}
