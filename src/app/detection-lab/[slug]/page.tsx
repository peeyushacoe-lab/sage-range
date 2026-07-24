import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { DetectionLabClient } from "./_components/detection-lab-client";

export const dynamic = "force-dynamic";

export default async function DetectionChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const challenge = await db.detectionChallenge.findUnique({ where: { slug } });
  if (!challenge || !challenge.published) notFound();

  // Strip the ground-truth isMalicious label before sending to the client —
  // students see the raw log data only, never the answer key.
  const rawEvents = challenge.events as { id: string; raw: string; fields: Record<string, string> }[];
  const eventsForClient = rawEvents.map((e) => ({ id: e.id, raw: e.raw, fields: e.fields }));

  const lastSubmission = await db.detectionSubmission.findFirst({
    where: { userId: user.id, challengeId: challenge.id },
    orderBy: { submittedAt: "desc" },
  });

  // One best (highest-F1) passing submission per user, for the leaderboard.
  const passingSubmissions = await db.detectionSubmission.findMany({
    where: { challengeId: challenge.id, passed: true },
    orderBy: { f1: "desc" },
    include: { user: { select: { id: true, displayName: true } } },
  });
  const seenUsers = new Set<string>();
  const leaderboard: { name: string; f1: number; score: number }[] = [];
  for (const s of passingSubmissions) {
    if (seenUsers.has(s.userId)) continue;
    seenUsers.add(s.userId);
    leaderboard.push({ name: s.user.displayName ?? "Anonymous", f1: s.f1, score: s.score });
    if (leaderboard.length >= 10) break;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/detection-lab" backLabel="Detection Lab" />
      <DetectionLabClient
        challengeId={challenge.id}
        title={challenge.title}
        description={challenge.description}
        points={challenge.points}
        events={eventsForClient}
        leaderboard={leaderboard}
        lastResult={
          lastSubmission
            ? {
                truePositives: lastSubmission.truePositives,
                falsePositives: lastSubmission.falsePositives,
                falseNegatives: lastSubmission.falseNegatives,
                trueNegatives: lastSubmission.trueNegatives,
                precision: lastSubmission.precision,
                recall: lastSubmission.recall,
                f1: lastSubmission.f1,
                passed: lastSubmission.passed,
                score: lastSubmission.score,
              }
            : null
        }
      />
    </main>
  );
}
