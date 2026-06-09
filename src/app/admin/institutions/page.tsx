import { db } from "@/lib/db";
import { NewInstitutionForm } from "../_components/new-institution-form";
import { InstitutionActiveToggle } from "../_components/institution-active-toggle";
import { CopyCodeBtn } from "../_components/copy-code-btn";

export const dynamic = "force-dynamic";

const PLAN_STYLE: Record<string, string> = {
  ENTERPRISE: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  PRO:        "bg-amber-500/10 text-amber-400 border-amber-500/30",
  BASIC:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  FREE:       "bg-zinc-800 text-zinc-500 border-zinc-700",
};

export default async function InstitutionsPage() {
  const institutions = await db.institution.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Institutions</h1>
          <p className="text-zinc-500 text-sm mt-1">{institutions.length} registered</p>
        </div>
        <NewInstitutionForm />
      </div>

      {institutions.length === 0 ? (
        <div className="rounded-xl border border-white/8 flex flex-col items-center justify-center py-20 text-center">
          <p className="text-zinc-500 text-sm mb-1">No institutions yet.</p>
          <p className="text-zinc-700 text-xs">Create one to start selling institution access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {institutions.map((inst) => {
            const expired = inst.expiresAt && inst.expiresAt < new Date();
            const seatPct = Math.round((inst._count.members / inst.seats) * 100);

            return (
              <div key={inst.id} className="rounded-xl border border-white/8 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-zinc-200">{inst.name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${PLAN_STYLE[inst.plan] ?? PLAN_STYLE.FREE}`}>
                        {inst.plan}
                      </span>
                      {expired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 bg-red-500/10 text-red-400 border-red-500/30">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{inst.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyCodeBtn code={inst.joinCode} />
                    <InstitutionActiveToggle id={inst.id} active={inst.active} />
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-zinc-600">
                  <span className="font-mono">{inst.joinCode}</span>
                  <span>{inst._count.members}/{inst.seats} seats</span>
                  {inst.expiresAt && <span>Expires {inst.expiresAt.toISOString().slice(0, 10)}</span>}
                </div>

                {/* Seat usage bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${seatPct > 90 ? "bg-red-500" : seatPct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, seatPct)}%` }}
                    />
                  </div>
                </div>

                {inst.notes && <p className="text-xs text-zinc-600 mt-2 italic">{inst.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
