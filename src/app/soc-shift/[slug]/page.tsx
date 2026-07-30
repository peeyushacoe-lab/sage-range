import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { SocShiftClient } from "../_components/soc-shift-client";

export const dynamic = "force-dynamic";

export default async function SocShiftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const shift = await db.socShift.findUnique({
    where: { slug },
    include: { alerts: { orderBy: { order: "asc" } } },
  });
  if (!shift || !shift.published) notFound();

  const lastAttempt = await db.socShiftAttempt.findFirst({
    where: { userId: user.id, shiftId: shift.id },
    orderBy: { startedAt: "desc" },
  });

  const leaderboard = await db.socShiftAttempt.findMany({
    where: { shiftId: shift.id, completedAt: { not: null }, user: { hidden: false } },
    orderBy: [{ score: "desc" }, { completedAt: "asc" }],
    take: 10,
    include: { user: { select: { displayName: true } } },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/soc-shift" backLabel="SOC Shift Mode" />
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
        leaderboard={leaderboard.map((a) => ({
          name: a.user.displayName ?? "Anonymous",
          score: a.score ?? 0,
          accuracyPct: a.accuracyPct ?? 0,
        }))}
      />
    </main>
  );
}
