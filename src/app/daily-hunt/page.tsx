import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { computeDailyHuntStatus } from "@/lib/daily-hunt";
import { Navbar } from "@/components/navbar";
import { StartHuntButton } from "./_components/start-hunt-button";
import { PageHeader } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "Daily Hunt · Sage Vault" };

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-ok bg-ok-wash border-ok-edge",
  MEDIUM: "text-warn bg-warn-wash border-warn-edge",
  HARD:   "text-danger bg-danger-wash border-danger-edge",
  INSANE: "text-accent bg-accent-wash border-accent-edge",
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
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <PageHeader
          eyebrow="SOC League"
          title="Daily Hunt"
          subtitle="One mystery incident, every day. Solve it fast for a bonus coin reward."
        />

        {!status && (
          <div className="rounded-xl border border-edge bg-surface-1 p-6 text-center">
            <p className="text-sm text-ink-3">No published labs available for today's hunt yet. Check back soon.</p>
          </div>
        )}

        {status && (
          <div className="rounded-xl border border-edge bg-surface-1 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-ink-3 mb-1">Today's Target</p>
                <h2 className="text-lg font-bold text-ink">{status.hunt.lab.title}</h2>
                <p className="text-xs text-ink-3 mt-1">{status.hunt.lab.category}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 shrink-0 ${DIFF_STYLE[status.hunt.lab.difficulty] ?? ""}`}>
                {status.hunt.lab.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-ink-3">
              <span>⏱ {formatMinSec(status.hunt.timeLimitSec)} time limit</span>
              <span className="flex items-center gap-1"><Icon name="coin" size={14} /> +{status.hunt.bonusCoins} bonus coins</span>
            </div>

            <div className="pt-2 border-t border-edge">
              {status.state === "not_started" && <StartHuntButton />}

              {status.state === "in_progress" && (
                <div className="space-y-2">
                  <p className="text-sm text-warn font-mono">{formatMinSec(Math.max(0, status.remainingSec))} remaining</p>
                  <Link
                    href={`/labs/${status.hunt.lab.slug}`}
                    className="inline-block rounded-lg bg-accent-fill px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                  >
                    Continue Hunt →
                  </Link>
                </div>
              )}

              {status.state === "expired" && (
                <p className="text-sm text-ink-3">
                  Time's up for today's window — the base lab reward still counts if you finish it, but the Daily Hunt bonus is gone. Come back tomorrow for a new hunt.
                </p>
              )}

              {status.state === "completed" && (
                <div>
                  <p className="text-sm font-mono text-ok">
                    Hunt complete — +{status.coinsAwarded} bonus coins
                    {status.timeTakenSec != null && <> in {formatMinSec(status.timeTakenSec)}</>}.
                  </p>
                  <Link href="/soc-league" className="text-xs text-ok hover:text-ok transition-colors mt-2 inline-block">
                    View SOC League rank →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/soc-league" className="text-sm text-ink-3 hover:text-ok transition-colors">
            ← SOC League rank ladder
          </Link>
        </div>

      </main>
    </div>
  );
}
