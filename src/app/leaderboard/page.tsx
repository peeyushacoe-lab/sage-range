import Link from "next/link";
import { db } from "@/lib/db";
import { LabType } from "@prisma/client";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "ALL", label: "Overall" },
  { key: "CTF", label: "CTF" },
  { key: "BLUE_TEAM", label: "Blue Team" },
  { key: "RED_TEAM", label: "Red Team" },
  { key: "SIM", label: "Simulations" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const filter: TabKey = (TABS.find((t) => t.key === type)?.key ?? "ALL") as TabKey;

  const top =
    filter === "ALL"
      ? await getOverall()
      : filter === "SIM"
      ? await getBySimulation()
      : await getByType(filter as Exclude<TabKey, "ALL" | "SIM">);

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mt-4 mb-2">Leaderboard</h1>
      <p className="text-zinc-500 mb-6">
        {filter === "SIM" ? "Top performers ranked by best simulation score." : "Top performers across labs and CTFs."}
      </p>

      <nav className="flex gap-2 mb-6">
        {TABS.map((t) => {
          const active = t.key === filter;
          return (
            <Link
              key={t.key}
              href={t.key === "ALL" ? "/leaderboard" : `/leaderboard?type=${t.key}`}
              className={
                active
                  ? "rounded-full bg-sage-500 px-4 py-1.5 text-sm font-medium text-black"
                  : "rounded-full border border-white/10 px-4 py-1.5 text-sm text-zinc-400 hover:text-white hover:border-white/30"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {top.length === 0 ? (
        <p className="text-zinc-500">No scores yet.</p>
      ) : (
        <ol className="rounded-lg border border-white/10 divide-y divide-white/10">
          {top.map((u, i) => (
            <li key={u.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="w-6 text-zinc-500 text-sm">{i + 1}</span>
                <div>
                  <p className="font-medium">{u.displayName ?? u.email.split("@")[0]}</p>
                  {u.university && <p className="text-xs text-zinc-500">{u.university}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {u.score} <span className="text-xs text-zinc-500">pts</span>
                </p>
                {filter === "ALL" && (
                  <p className="text-xs text-zinc-500">{u.xp} xp</p>
                )}
                {"simCount" in u && typeof u.simCount === "number" && u.simCount > 0 && (
                  <p className="text-xs text-zinc-500">{u.simCount} sim{u.simCount !== 1 ? "s" : ""}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      </div>
    </main>
  );
}

async function getOverall() {
  const users = await db.user.findMany({
    orderBy: [{ skillScore: "desc" }, { xp: "desc" }],
    take: 50,
    select: { id: true, displayName: true, email: true, skillScore: true, xp: true, university: true },
  });
  return users.map((u) => ({ ...u, score: u.skillScore }));
}

async function getByType(type: LabType) {
  const grouped = await db.attempt.groupBy({
    by: ["userId"],
    where: { status: "SOLVED", lab: { type } },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
    take: 50,
  });

  if (grouped.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, displayName: true, email: true, xp: true, university: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = byId.get(g.userId);
      if (!u) return null;
      return { ...u, score: g._sum.score ?? 0 };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

async function getBySimulation() {
  const grouped = await db.simulationSession.groupBy({
    by: ["userId"],
    where: { status: { in: ["CONTAINED", "BREACHED"] } },
    _max: { score: true },
    _count: { id: true },
    orderBy: { _max: { score: "desc" } },
    take: 50,
  });

  if (grouped.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, displayName: true, email: true, xp: true, university: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = byId.get(g.userId);
      if (!u) return null;
      return { ...u, score: g._max.score ?? 0, simCount: g._count.id };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
