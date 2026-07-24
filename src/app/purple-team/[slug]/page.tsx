import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PurpleTeamClient } from "./_components/purple-team-client";

export const dynamic = "force-dynamic";

type RawStep = { step: number; narrative: string; events: { id: string; raw: string; fields: Record<string, string> }[] };

export default async function PurpleTeamReplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const replay = await db.purpleTeamReplay.findUnique({ where: { slug } });
  if (!replay || !replay.published) notFound();

  // Strip isMalicious before sending to the client — same rule as the
  // Detection Validation Engine.
  const rawSteps = replay.steps as unknown as RawStep[];
  const stepsForClient = rawSteps.map((s) => ({
    step: s.step,
    narrative: s.narrative,
    events: s.events.map((e) => ({ id: e.id, raw: e.raw, fields: e.fields })),
  }));

  const session = await db.purpleTeamReplaySession.findUnique({
    where: { userId_replayId: { userId: user.id, replayId: replay.id } },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/purple-team" backLabel="Purple Team Replay" />
      <PurpleTeamClient
        replayId={replay.id}
        title={replay.title}
        description={replay.description}
        points={replay.points}
        steps={stepsForClient}
        initialStep={session?.currentStep ?? 1}
        completed={!!session?.completedAt}
        bestF1={session?.bestF1 ?? 0}
      />
    </main>
  );
}
