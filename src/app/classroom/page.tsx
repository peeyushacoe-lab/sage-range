import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { CreateClassroomClient, JoinClassroomClient } from "./_components/classroom-hub-client";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function ClassroomHub() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const isInstructor = user.role === "INSTRUCTOR" || user.role === "ADMIN";

  const [myClasses, enrolledClasses] = await Promise.all([
    isInstructor
      ? db.classroom.findMany({
          where: { instructorId: user.id },
          include: { _count: { select: { enrollments: true, assignments: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    db.classroomEnrollment.findMany({
      where: { userId: user.id },
      include: {
        classroom: {
          include: { _count: { select: { assignments: true } } },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* Instructor section */}
        {isInstructor && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Your Classes</h2>
              <p className="text-sm text-zinc-400 mt-1">Create a class, share the join code with students, and assign labs.</p>
            </div>

            <div className="mb-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">New class</p>
              <CreateClassroomClient />
            </div>

            {myClasses.length === 0 ? (
              <p className="text-sm text-zinc-600">No classes yet. Create one above.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myClasses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/classroom/${c.id}`}
                    className="rounded-xl border border-white/8 p-4 hover:border-sage-500/40 hover:bg-white/3 transition flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{c.name}</h3>
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">{c.joinCode}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>{c._count.enrollments} student{c._count.enrollments !== 1 ? "s" : ""}</span>
                      <span>{c._count.assignments} lab{c._count.assignments !== 1 ? "s" : ""} assigned</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Student section */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-bold">Enrolled Classes</h2>
            <p className="text-sm text-zinc-400 mt-1">Enter a join code from your instructor to enroll.</p>
          </div>

          <div className="mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Join a class</p>
            <JoinClassroomClient />
          </div>

          {enrolledClasses.length === 0 ? (
            <p className="text-sm text-zinc-600">Not enrolled in any classes yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {enrolledClasses.map(({ classroom }) => (
                <Link
                  key={classroom.id}
                  href={`/classroom/${classroom.id}`}
                  className="rounded-xl border border-white/8 p-4 hover:border-sage-500/40 hover:bg-white/3 transition flex flex-col gap-2"
                >
                  <h3 className="font-semibold">{classroom.name}</h3>
                  <p className="text-xs text-zinc-500">{classroom._count.assignments} lab{classroom._count.assignments !== 1 ? "s" : ""} assigned</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
