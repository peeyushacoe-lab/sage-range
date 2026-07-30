import { db } from "@/lib/db";
import { NewOrganizationForm } from "../_components/new-organization-form";
import { OrganizationActiveToggle } from "../_components/organization-active-toggle";
import { OrganizationMembersPanel } from "../_components/organization-members-panel";
import { CopyCodeBtn } from "../_components/copy-code-btn";

export const dynamic = "force-dynamic";

const PLAN_STYLE: Record<string, string> = {
  ENTERPRISE: "bg-accent-wash text-accent border-accent-edge",
  PRO:        "bg-warn-wash text-warn border-warn-edge",
  BASIC:      "bg-ok-wash text-ok border-ok-edge",
  FREE:       "bg-surface-2 text-ink-3 border-edge-strong",
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
          <p className="text-ink-3 text-sm mt-1">{organizations.length} registered</p>
        </div>
        <NewOrganizationForm />
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-xl border border-edge flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-3 text-sm mb-1">No organizations yet.</p>
          <p className="text-ink-3 text-xs">Create one to start selling organization access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => {
            const expired = org.expiresAt && org.expiresAt < new Date();
            const seatPct = Math.round((org._count.members / org.seats) * 100);

            return (
              <div key={org.id} className="rounded-xl border border-edge p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-ink">{org.name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${PLAN_STYLE[org.plan] ?? PLAN_STYLE.FREE}`}>
                        {org.plan}
                      </span>
                      {expired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 bg-danger-wash text-danger border-danger-edge">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-3">{org.contactEmail}</p>
                    {org.domain && (
                      <p className="text-xs text-ok font-mono mt-0.5">@{org.domain} auto-joins</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyCodeBtn code={org.joinCode} />
                    <OrganizationActiveToggle id={org.id} active={org.active} />
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-ink-3">
                  <span className="font-mono">{org.joinCode}</span>
                  <span>{org._count.members}/{org.seats} seats</span>
                  {org.expiresAt && <span>Expires {org.expiresAt.toISOString().slice(0, 10)}</span>}
                </div>

                {/* Seat usage bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${seatPct > 90 ? "bg-danger" : seatPct > 70 ? "bg-warn" : "bg-ok"}`}
                      style={{ width: `${Math.min(100, seatPct)}%` }}
                    />
                  </div>
                </div>

                {org.notes && <p className="text-xs text-ink-3 mt-2 italic">{org.notes}</p>}

                <OrganizationMembersPanel orgId={org.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
