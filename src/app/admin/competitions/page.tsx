import { db } from "@/lib/db";
import { NewCompetitionForm } from "../_components/new-competition-form";
import { CompetitionToggle } from "../_components/competition-toggle";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const [competitions, publishedLabs] = await Promise.all([
    db.competition.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { entries: true } } },
    }),
    db.lab.findMany({ where: { published: true }, select: { id: true, slug: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Competitions</h1>
          <p className="text-ink-3 text-sm mt-1">{competitions.length} total</p>
        </div>
        <NewCompetitionForm labs={publishedLabs} />
      </div>

      {competitions.length === 0 ? (
        <div className="rounded-xl border border-edge flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-3 text-sm mb-1">No competitions yet.</p>
          <p className="text-ink-3 text-xs">Create one using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => {
            const status = now < c.startDate ? "upcoming" : now > c.endDate ? "ended" : "active";
            const statusStyle = {
              active:   "bg-ok-wash text-ok border-ok-edge",
              upcoming: "bg-warn-wash text-warn border-warn-edge",
              ended:    "bg-surface-2 text-ink-3 border-edge-strong",
            }[status];

            return (
              <div key={c.id} className="rounded-xl border border-edge p-5 flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-ink truncate">{c.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 shrink-0 ${statusStyle}`}>
                      {status}
                    </span>
                    {!c.published && (
                      <span className="text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 shrink-0 bg-surface-2 text-ink-3 border-edge-strong">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-3 font-mono">{c.slug}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-ink-3">
                    <span>{c.startDate.toISOString().slice(0, 10)} → {c.endDate.toISOString().slice(0, 10)}</span>
                    <span>{c._count.entries} entrant{c._count.entries !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <CompetitionToggle id={c.id} published={c.published} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
