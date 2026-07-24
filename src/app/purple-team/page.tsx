import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-sage-500",
  MEDIUM: "text-amber-400",
  HARD: "text-orange-400",
  INSANE: "text-red-400",
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Purple Team Replay</h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            Attack sequences revealed step by step. Hold one detection rule and refine it live as the campaign
            unfolds — the same skill as tuning a real detection in production while an incident is still active.
          </p>
        </header>

        {replays.length === 0 ? (
          <p className="text-zinc-500 text-sm">No replays published yet.</p>
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
                    done ? "border-sage-500/40 bg-sage-500/5" : "border-white/8 bg-zinc-900/60 hover:border-sage-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${DIFF_COLORS[r.difficulty] ?? "text-zinc-400"}`}>{r.difficulty}</span>
                    <span className="text-xs font-bold text-zinc-400 font-mono">{r.points} pts</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">{r.title}{done && <span className="text-sage-500">✓</span>}</h3>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{r.description}</p>
                  </div>
                  <p className="text-xs font-mono text-zinc-500 mt-auto pt-1">
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
