import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { SocShiftClient } from "./_components/soc-shift-client";

export const dynamic = "force-dynamic";

export default async function SocShiftPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const shift = await db.socShift.findFirst({
    where: { published: true },
    include: { alerts: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  if (!shift) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-zinc-500 text-sm">No SOC shift published yet.</p>
        </div>
      </main>
    );
  }

  const lastAttempt = await db.socShiftAttempt.findFirst({
    where: { userId: user.id, shiftId: shift.id },
    orderBy: { startedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <SocShiftClient
        shift={{
          id: shift.id,
          title: shift.title,
          briefing: shift.briefing,
          timeLimitSec: shift.timeLimitSec,
          alerts: shift.alerts.map((a) => ({
            id: a.id,
            source: a.source,
            summary: a.summary,
            rawLog: a.rawLog,
          })),
        }}
        initialAttempt={
          lastAttempt
            ? {
                id: lastAttempt.id,
                startedAt: lastAttempt.startedAt.toISOString(),
                completedAt: lastAttempt.completedAt?.toISOString() ?? null,
                score: lastAttempt.score,
                accuracyPct: lastAttempt.accuracyPct,
              }
            : null
        }
      />
    </main>
  );
}
