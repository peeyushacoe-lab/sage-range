import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { listChampionships, getActiveChampionship } from "@/lib/championships";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monthly Championship · Sage Vault" };

const TIER_TONE = {
  CHAMPION: "amber",
  MEDALLIST: "purple",
  FINALIST: "blue",
  COMPETITOR: "zinc",
} as const;

function daysLeft(endsAt: Date): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000));
}

export default async function ChampionshipHubPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [active, past, myAwards] = await Promise.all([
    getActiveChampionship(),
    listChampionships(12),
    db.championshipAward.findMany({
      where: { userId: user.id },
      include: { championship: { select: { title: true, slug: true } } },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  const myActiveEntry = active
    ? await db.championshipEntry.findUnique({
        where: { championshipId_userId: { championshipId: active.id, userId: user.id } },
      })
    : null;

  const concluded = past.filter((c) => c.status === "CONCLUDED");

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Monthly Championship"
          subtitle="One challenge set, one month, one leaderboard. The podium and top finalists earn a verifiable certificate."
        />

        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="This month"
            value={active ? `${daysLeft(active.endsAt)}d` : "—"}
            sub={active ? "remaining" : "none running"}
          />
          <StatCard
            label="Your score"
            value={myActiveEntry?.score ?? "—"}
            sub={myActiveEntry ? `${myActiveEntry.solved} solved` : "not entered"}
          />
          <StatCard label="Certificates" value={myAwards.length} sub="earned" />
          <StatCard label="Past events" value={concluded.length} sub="concluded" />
        </div>

        {/* ── Current ── */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Running now
          </h2>

          {!active ? (
            <EmptyState
              icon="trophy"
              title="No championship is running"
              description="A new championship opens on the first of each month. Check back then, or keep sharpening up in the labs."
              action={{ label: "Browse Labs", href: "/labs" }}
            />
          ) : (
            <Card className="p-6" interactive>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/championship/${active.slug}`}
                    className="text-xl font-bold hover:text-emerald-400"
                  >
                    {active.title}
                  </Link>
                  <p className="mt-1 max-w-xl text-sm text-zinc-400">{active.description}</p>
                  <p className="mt-3 text-xs text-zinc-600">
                    {(active.labSlugs as string[]).length} challenges ·{" "}
                    closes {active.endsAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone="emerald">{daysLeft(active.endsAt)} days left</Badge>
                  {myActiveEntry && (
                    <p className="mt-2 font-mono text-2xl font-black tabular-nums text-emerald-400">
                      {myActiveEntry.score}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </section>

        {/* ── Your certificates ── */}
        {myAwards.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Your championship certificates
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {myAwards.map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon name="trophy" size={18} />
                      {a.championship.title}
                    </span>
                    <Badge tone={TIER_TONE[a.tier]}>{a.tier}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Placed #{a.rank} · issued {a.issuedAt.toLocaleDateString("en-GB")}
                  </p>
                  <Link
                    href={`/championship/certificate/${a.certCode}`}
                    className="mt-2 block font-mono text-xs text-emerald-400 hover:underline"
                  >
                    {a.certCode} →
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Past ── */}
        {concluded.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Past championships
            </h2>
            <Card className="divide-y divide-white/5 p-0">
              {concluded.map((c) => (
                <Link
                  key={c.id}
                  href={`/championship/${c.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{c.title}</p>
                    <p className="text-xs text-zinc-600">
                      {c._count.entries} entrant{c._count.entries === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </Link>
              ))}
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
