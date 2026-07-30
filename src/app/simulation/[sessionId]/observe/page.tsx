import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { ObserveClient } from "./_components/observe-client";

export const dynamic = "force-dynamic";

export default async function ObservePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      template: { select: { name: true, industry: true } },
      user: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!session) notFound();

  // Verify student is enrolled in one of this instructor's classrooms
  if (user.role !== "ADMIN") {
    const enrollment = await db.classroomEnrollment.findFirst({
      where: {
        userId: session.userId,
        classroom: { instructorId: user.id },
      },
    });
    if (!enrollment) redirect("/classroom");
  }

  const studentName = session.user.displayName || session.user.email?.split("@")[0] || "Student";

  return (
    <>
      <Navbar backHref="/classroom" backLabel="Classrooms" />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">Instructor Observation</span>
              <span className="text-zinc-700">·</span>
              <span className="text-[10px] uppercase tracking-widest text-blue-400">Read-only</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{studentName}</h1>
                <p className="text-zinc-400 text-sm mt-0.5">
                  {session.template.name} · {session.template.industry}
                </p>
              </div>
              <Link
                href={`/simulation/${sessionId}/debrief`}
                className="text-xs text-zinc-500 hover:text-zinc-300 border border-white/10 rounded-lg px-3 py-2 transition"
              >
                View Full Debrief →
              </Link>
            </div>
          </div>

          {/* Live client */}
          <ObserveClient sessionId={sessionId} />
        </div>
      </main>
    </>
  );
}
