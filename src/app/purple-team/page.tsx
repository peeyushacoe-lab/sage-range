import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-ok",
  MEDIUM: "text-warn",
  HARD: "text-sev-high",
  INSANE: "text-danger",
};

export default async function PurpleTeamIndex() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const replays = await db.purpleTeamReplay.findMany({ where: { published: true }, orderBy: { difficulty: "asc" } });
  const sessions = await db.purpleTeamReplaySession.findMany({
    where: { userId: user.id, replayId: { in: replays.map((r) => r.id) } },
  });
  const sessionByReplay = new Map(sessions.map((s) => [s.replayId, s]));

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Purple Team Replay"
          subtitle="Attack sequences revealed step by step. Hold one detection rule and refine it live as the campaign unfolds — the same skill as tuning a real detection in production while an incident is still active."
        />

        {replays.length === 0 ? (
          <EmptyState icon="progress" title="No replays published yet" description="Check back soon for a new attack sequence to work." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {replays.map((r) => {
              const stepCount = (r.steps as unknown[]).length;
              const session = sessionByReplay.get(r.id);
              const done = !!session?.completedAt;
              return (
                <Link
                  key={r.id}
                  href={`/purple-team/${r.slug}`}
                  className={`rounded-xl border p-5 flex flex-col gap-3 transition ${
                    done ? "border-ok-edge bg-ok-wash" : "border-edge bg-surface-1 hover:border-ok-edge"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${DIFF_COLORS[r.difficulty] ?? "text-ink-2"}`}>{r.difficulty}</span>
                    <span className="text-xs font-bold text-ink-2 font-mono">{r.points} pts</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">{r.title}{done && <span className="text-ok"><Icon name="check" size={14} className="inline-block shrink-0" /></span>}</h3>
                    <p className="text-sm text-ink-2 mt-2 line-clamp-2 leading-relaxed">{r.description}</p>
                  </div>
                  <p className="text-xs font-mono text-ink-3 mt-auto pt-1">
                    {stepCount} steps{session ? ` · step ${session.currentStep}/${stepCount}` : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
