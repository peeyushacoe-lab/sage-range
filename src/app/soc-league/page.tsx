import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { SOC_LEAGUE_RANKS, getSocLeagueRank } from "@/lib/soc-league";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "SOC League · Sage Vault" };

export default async function SocLeaguePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const rank = getSocLeagueRank(me.coins);

  const leaderboard = await db.user.findMany({
    where: { role: "STUDENT", hidden: false, coins: { gt: 0 } },
    select: { id: true, displayName: true, email: true, coins: true },
    orderBy: { coins: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        <PageHeader
          eyebrow="SOC League"
          title="Rank Ladder"
          subtitle="Earned from lab solves and Daily Hunt bonuses — separate from your skill score."
          actions={
            <div className="text-right">
              <p className="text-3xl font-black tabular-nums">{me.coins}</p>
              <p className="text-xs text-ink-3 mt-0.5">coins</p>
            </div>
          }
        />

        {/* Current rank card */}
        <div className="rounded-xl border border-edge bg-surface-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold" style={{ color: rank.color }}>{rank.label}</span>
            {rank.nextLabel && (
              <span className="text-xs text-ink-3">
                {rank.coinsToNext} coins to <span className="text-ink-2 font-semibold">{rank.nextLabel}</span>
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${rank.pct}%`, backgroundColor: rank.color }} />
          </div>
          {!rank.nextLabel && (
            <p className="text-xs text-ok mt-2 font-semibold">Top rank reached — CyberSage Champion.</p>
          )}
        </div>

        {/* Full ladder */}
        <div className="rounded-xl border border-edge bg-surface-1 p-5">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">The Ladder</p>
          <div className="space-y-2">
            {SOC_LEAGUE_RANKS.map((tier) => {
              const active = tier.tier === rank.tier;
              return (
                <div
                  key={tier.tier}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${active ? "bg-surface-2 border border-edge" : ""}`}
                >
                  <span className="text-sm font-semibold" style={{ color: tier.color }}>{tier.label}</span>
                  <span className="text-xs text-ink-3 tabular-nums">{tier.min}+ coins</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-edge bg-surface-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-edge">
            <p className="text-xs uppercase tracking-widest text-ink-3">Coin Leaderboard</p>
          </div>
          {leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-xs text-ink-3 text-center">No coins earned yet — be the first.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-edge-subtle">
                {leaderboard.map((u, i) => {
                  const uRank = getSocLeagueRank(u.coins);
                  return (
                    <tr key={u.id} className={u.id === me.id ? "bg-ok-wash" : ""}>
                      <td className="px-4 py-2.5 text-ink-3 text-xs w-8">
                        {i < 3 ? <Icon name="medal" size={15} tone={(["gold","slate","amber"] as const)[i]} /> : i + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/profile/${u.id}`} className="font-medium text-ink hover:text-ok transition-colors">
                          {u.displayName ?? u.email}
                        </Link>
                        <span className="ml-2 text-[10px] font-bold" style={{ color: uRank.color }}>{uRank.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-ink">{u.coins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-center">
          <Link href="/daily-hunt" className="text-sm text-ok hover:text-ok transition-colors">
            Today's Daily Hunt →
          </Link>
        </div>

      </main>
    </div>
  );
}
