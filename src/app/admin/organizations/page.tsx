import { db } from "@/lib/db";
import { NewOrganizationForm } from "../_components/new-organization-form";
import { OrganizationActiveToggle } from "../_components/organization-active-toggle";
import { OrganizationMembersPanel } from "../_components/organization-members-panel";
import { CopyCodeBtn } from "../_components/copy-code-btn";

export const dynamic = "force-dynamic";

const PLAN_STYLE: Record<string, string> = {
  ENTERPRISE: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  PRO:        "bg-amber-500/10 text-amber-400 border-amber-500/30",
  BASIC:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  FREE:       "bg-zinc-800 text-zinc-500 border-zinc-700",
};

export default async function OrganizationsPage() {
  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-zinc-500 text-sm mt-1">{organizations.length} registered</p>
        </div>
        <NewOrganizationForm />
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-xl border border-white/8 flex flex-col items-center justify-center py-20 text-center">
          <p className="text-zinc-500 text-sm mb-1">No organizations yet.</p>
          <p className="text-zinc-700 text-xs">Create one to start selling organization access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => {
            const expired = org.expiresAt && org.expiresAt < new Date();
            const seatPct = Math.round((org._count.members / org.seats) * 100);

            return (
              <div key={org.id} className="rounded-xl border border-white/8 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-zinc-200">{org.name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${PLAN_STYLE[org.plan] ?? PLAN_STYLE.FREE}`}>
                        {org.plan}
                      </span>
                      {expired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 bg-red-500/10 text-red-400 border-red-500/30">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{org.contactEmail}</p>
                    {org.domain && (
                      <p className="text-xs text-sage-400 font-mono mt-0.5">@{org.domain} auto-joins</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyCodeBtn code={org.joinCode} />
                    <OrganizationActiveToggle id={org.id} active={org.active} />
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-zinc-600">
                  <span className="font-mono">{org.joinCode}</span>
                  <span>{org._count.members}/{org.seats} seats</span>
                  {org.expiresAt && <span>Expires {org.expiresAt.toISOString().slice(0, 10)}</span>}
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

                {org.notes && <p className="text-xs text-zinc-600 mt-2 italic">{org.notes}</p>}

                <OrganizationMembersPanel orgId={org.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
