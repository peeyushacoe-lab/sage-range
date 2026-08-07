import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getLeaderboard } from "@/lib/ozh";
import { OZH_CLOSES_AT, MAX_SCORE, windowStateAt } from "@/lib/ozh-engine";
import { formatIST, formatElapsed } from "@/lib/ozh-format";
import { Navbar } from "@/components/navbar";
import { Card, Badge, PageHeader, EmptyState, buttonVariants } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zero Hour Leaderboard · Sage Vault" };

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function ZeroHourLeaderboardPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const entries = await getLeaderboard();
  const state = windowStateAt(new Date());
  const you = entries.find((e) => e.userId === user.id);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <PageHeader
          className="mb-2"
          title="Operation Zero Hour"
          subtitle="Ranked by score, then accuracy, then time — so the best investigation wins, not the fastest clicking."
        />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge tone={state === "OPEN" ? "emerald" : state === "BEFORE" ? "blue" : "zinc"}>
            {state === "OPEN" ? "Live" : state === "BEFORE" ? "Not yet open" : "Closed"}
          </Badge>
          <span className="text-xs text-zinc-500">
            {state === "CLOSED" ? "Closed" : "Closes"} {formatIST(OZH_CLOSES_AT)} IST
          </span>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="No results yet"
            description="The board fills as operations are submitted."
          />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Analyst</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                  <th className="px-4 py-3 text-right font-medium">Accuracy</th>
                  <th className="px-4 py-3 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const mine = e.userId === user.id;
                  return (
                    <tr
                      key={e.userId}
                      className={`border-b border-white/5 last:border-0 ${
                        mine ? "bg-emerald-500/[0.06]" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-zinc-400">
                        {e.rank <= 3 ? MEDAL[e.rank - 1] : e.rank}
                      </td>
                      <td className="px-4 py-3">
                        <span className={mine ? "font-semibold text-emerald-300" : "text-zinc-200"}>
                          {e.displayName}
                          {mine && <span className="ml-2 text-[10px] text-zinc-500">you</span>}
                        </span>
                        {e.university && (
                          <span className="block text-[11px] text-zinc-600">{e.university}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-200">
                        {e.score}
                        <span className="text-zinc-600">/{MAX_SCORE}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-400">
                        {e.accuracy}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-500">
                        {formatElapsed(e.elapsedSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={you ? "/operations/zero-hour/result" : "/operations/zero-hour"}
            className={buttonVariants({ variant: "secondary" })}
          >
            {you ? "Your result" : "Mission briefing"}
          </Link>
        </div>
      </div>
    </main>
  );
}
