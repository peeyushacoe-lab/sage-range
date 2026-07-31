import { redirect, notFound } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getRunView } from "@/lib/crisis";
import { clockAt, pendingInjects } from "@/lib/crisis-engine";
import { Navbar } from "@/components/navbar";
import { CommandCenter } from "./_components/command-center";

export const dynamic = "force-dynamic";
export const metadata = { title: "Command Center · Sage Vault" };

export default async function CrisisRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const view = await getRunView(runId, user.id);
  if (!view) notFound();

  // A finished run has nothing left to command; send it to the debrief.
  if (view.run.status !== "IN_PROGRESS" || view.complete) {
    redirect(`/crisis/run/${runId}/debrief`);
  }

  const upcoming = pendingInjects(view.scenario, view.state.minute);
  const nextArrival = upcoming.length ? upcoming[0].atMinute - view.state.minute : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <CommandCenter
        runId={runId}
        title={view.scenario.title}
        clock={clockAt(view.scenario, view.state.minute)}
        minute={view.state.minute}
        durationMinutes={view.scenario.durationMinutes}
        state={{
          containment: view.state.containment,
          reputation: view.state.reputation,
          morale: view.state.morale,
          financialLoss: view.state.financialLoss,
        }}
        active={view.active.map((i) => ({
          id: i.id,
          channel: i.channel,
          title: i.title,
          body: i.body,
          arrivedAt: clockAt(view.scenario, i.atMinute),
          minutesLeft: i.atMinute + i.deadlineMinutes - view.state.minute,
          options: i.options.map((o) => ({
            id: o.id,
            label: o.label,
            detail: o.detail ?? null,
            costMinutes: o.costMinutes,
          })),
        }))}
        lapsed={view.lapsed.map((i) => ({
          id: i.id,
          title: i.title,
          note: i.escalation.note,
          at: clockAt(view.scenario, i.atMinute + i.deadlineMinutes),
        }))}
        remaining={upcoming.length}
        nextArrivalIn={nextArrival}
      />
    </main>
  );
}
