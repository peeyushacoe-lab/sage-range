import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { SOC_LEAGUE_RANKS, getSocLeagueRank } from "@/lib/soc-league";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "SOC League · Sage Vault" };

export default async function SocLeaguePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const rank = getSocLeagueRank(me.coins);

  const leaderboard = await db.user.findMany({
    where: { role: "STUDENT", coins: { gt: 0 } },
    select: { id: true, displayName: true, email: true, coins: true },
    orderBy: { coins: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">SOC League</p>
            <h1 className="text-2xl font-bold">Rank Ladder</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Earned from lab solves and Daily Hunt bonuses — separate from your skill score.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums">{me.coins}</p>
            <p className="text-xs text-zinc-500 mt-0.5">coins</p>
          </div>
        </div>

        {/* Current rank card */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold" style={{ color: rank.color }}>{rank.label}</span>
            {rank.nextLabel && (
              <span className="text-xs text-zinc-500">
                {rank.coinsToNext} coins to <span className="text-zinc-300 font-semibold">{rank.nextLabel}</span>
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div className="h-full rounded-full transition-all" style={{ width: `${rank.pct}%`, backgroundColor: rank.color }} />
          </div>
          {!rank.nextLabel && (
            <p className="text-xs text-emerald-400 mt-2 font-semibold">Top rank reached — CyberSage Champion.</p>
          )}
        </div>

        {/* Full ladder */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">The Ladder</p>
          <div className="space-y-2">
            {SOC_LEAGUE_RANKS.map((tier) => {
              const active = tier.tier === rank.tier;
              return (
                <div
                  key={tier.tier}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${active ? "bg-white/5 border border-white/10" : ""}`}
                >
                  <span className="text-sm font-semibold" style={{ color: tier.color }}>{tier.label}</span>
                  <span className="text-xs text-zinc-500 tabular-nums">{tier.min}+ coins</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Coin Leaderboard</p>
          </div>
          {leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-xs text-zinc-600 text-center">No coins earned yet — be the first.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((u, i) => {
                  const uRank = getSocLeagueRank(u.coins);
                  return (
                    <tr key={u.id} className={u.id === me.id ? "bg-emerald-500/5" : ""}>
                      <td className="px-4 py-2.5 text-zinc-500 text-xs w-8">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/profile/${u.id}`} className="font-medium text-zinc-200 hover:text-emerald-400 transition-colors">
                          {u.displayName ?? u.email}
                        </Link>
                        <span className="ml-2 text-[10px] font-bold" style={{ color: uRank.color }}>{uRank.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-zinc-200">{u.coins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-center">
          <Link href="/daily-hunt" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            Today's Daily Hunt →
          </Link>
        </div>

      </main>
    </div>
  );
}
