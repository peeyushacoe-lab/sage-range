import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function formatWeekOf(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ThreatBulletinPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const bulletins = await db.threatBulletin.findMany({
    where: { published: true },
    orderBy: { weekOf: "desc" },
    take: 10,
  });

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Weekly Threat Bulletin"
          subtitle="Current threat intelligence — actors, malware families, new CVEs, IOCs, and TTPs. Simulations and labs published in the same week often use these exact indicators, so read this before you dig in."
        />

        {bulletins.length === 0 ? (
          <EmptyState icon="news" title="No bulletins published yet" description="The first threat bulletin is being prepared. Check back soon." />
        ) : (
          <div className="space-y-6">
            {bulletins.map((b) => (
              <article key={b.id} className="rounded-xl border border-edge bg-surface-1 p-6">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-xs uppercase tracking-widest text-ink-3 font-mono">Week of {formatWeekOf(b.weekOf)}</span>
                  <span className="text-xs font-bold text-warn font-mono">{b.actorOrFamily}</span>
                </div>
                <h2 className="text-xl font-bold mb-3">{b.headline}</h2>
                <p className="text-sm text-ink-2 leading-relaxed mb-4">{b.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-2">New CVEs</p>
                    <ul className="space-y-1">
                      {b.newCves.map((c) => (
                        <li key={c} className="text-xs text-ink-2 font-mono leading-relaxed">{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-2">New IOCs</p>
                    <ul className="space-y-1">
                      {b.newIocs.map((c) => (
                        <li key={c} className="text-xs text-ink-2 font-mono leading-relaxed break-all">{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-2">TTPs</p>
                    <ul className="space-y-1">
                      {b.ttps.map((c) => (
                        <li key={c} className="text-xs text-ink-2 font-mono leading-relaxed">{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
