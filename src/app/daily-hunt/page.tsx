import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { computeDailyHuntStatus } from "@/lib/daily-hunt";
import { Navbar } from "@/components/navbar";
import { StartHuntButton } from "./_components/start-hunt-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily Hunt · Sage Vault" };

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HARD:   "text-red-400 bg-red-500/10 border-red-500/20",
  INSANE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function formatMinSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function DailyHuntPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const status = await computeDailyHuntStatus(me.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">SOC League</p>
          <h1 className="text-2xl font-bold">Daily Hunt</h1>
          <p className="text-sm text-zinc-500 mt-1">One mystery incident, every day. Solve it fast for a bonus coin reward.</p>
        </div>

        {!status && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm text-zinc-500">No published labs available for today's hunt yet. Check back soon.</p>
          </div>
        )}

        {status && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Today's Target</p>
                <h2 className="text-lg font-bold text-zinc-100">{status.hunt.lab.title}</h2>
                <p className="text-xs text-zinc-500 mt-1">{status.hunt.lab.category}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 shrink-0 ${DIFF_STYLE[status.hunt.lab.difficulty] ?? ""}`}>
                {status.hunt.lab.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>⏱ {formatMinSec(status.hunt.timeLimitSec)} time limit</span>
              <span>🪙 +{status.hunt.bonusCoins} bonus coins</span>
            </div>

            <div className="pt-2 border-t border-white/8">
              {status.state === "not_started" && <StartHuntButton />}

              {status.state === "in_progress" && (
                <div className="space-y-2">
                  <p className="text-sm text-amber-400 font-mono">{formatMinSec(Math.max(0, status.remainingSec))} remaining</p>
                  <Link
                    href={`/labs/${status.hunt.lab.slug}`}
                    className="inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
                  >
                    Continue Hunt →
                  </Link>
                </div>
              )}

              {status.state === "expired" && (
                <p className="text-sm text-zinc-500">
                  Time's up for today's window — the base lab reward still counts if you finish it, but the Daily Hunt bonus is gone. Come back tomorrow for a new hunt.
                </p>
              )}

              {status.state === "completed" && (
                <div>
                  <p className="text-sm font-mono text-sage-400">
                    Hunt complete — +{status.coinsAwarded} bonus coins
                    {status.timeTakenSec != null && <> in {formatMinSec(status.timeTakenSec)}</>}.
                  </p>
                  <Link href="/soc-league" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-2 inline-block">
                    View SOC League rank →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/soc-league" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">
            ← SOC League rank ladder
          </Link>
        </div>

      </main>
    </div>
  );
}
