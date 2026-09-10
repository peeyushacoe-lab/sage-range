import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getScenario } from "@/lib/missions";
import { db } from "@/lib/db";
import { SceneLoader } from "./_components/scene-loader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investigating · Mission Analyst" };

export default async function InvestigatePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const scenario = await getScenario(slug);
  if (!scenario || !scenario.published) redirect("/missionanalyst");

  const session = await db.missionSession.findUnique({
    where: { userId_scenarioId: { userId: user.id, scenarioId: scenario.id } },
  });
  // No session yet means they skipped the briefing's start button — send them
  // back rather than silently creating one here, so /missionanalyst stays
  // the single place a session gets created.
  if (!session) redirect("/missionanalyst");
  if (session.status !== "IN_PROGRESS") redirect("/missionanalyst");

  return (
    <SceneLoader
      sessionId={session.id}
      title={scenario.title}
      objective={scenario.objective}
      environment={scenario.environment}
    />
  );
}
