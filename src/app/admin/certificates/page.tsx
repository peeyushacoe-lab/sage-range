import { db } from "@/lib/db";
import { ApprovalRowActions } from "./_components/approval-row-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate Approvals — Admin" };

const KIND_LABEL: Record<string, string> = { PATH: "Learning Path", ACADEMY: "Academy Course", IR: "IR Commander" };

export default async function AdminCertificatesPage() {
  const [pending, decided] = await Promise.all([
    db.certificateApproval.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    }),
    db.certificateApproval.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { decidedAt: "desc" },
      take: 30,
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        decidedBy: { select: { displayName: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Certificate Approvals</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Users only see a certificate once you approve it here — completing the path/course/requirements just opens a request.
        </p>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
          Pending {pending.length > 0 && <span className="text-amber-400">({pending.length})</span>}
        </h2>
        <div className="rounded-xl border border-white/8 overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-600 p-5">No pending requests.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {pending.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100">
                      {req.user.displayName ?? req.user.email.split("@")[0]}
                      <span className="text-zinc-500 font-normal"> · {req.user.email}</span>
                    </p>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      <span className="text-zinc-500">{KIND_LABEL[req.kind]}:</span> {req.title}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1 font-mono">
                      requested {req.requestedAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <ApprovalRowActions id={req.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Recent decisions</h2>
        <div className="rounded-xl border border-white/8 overflow-hidden">
          {decided.length === 0 ? (
            <p className="text-sm text-zinc-600 p-5">No decisions yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {decided.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300">
                      {req.user.displayName ?? req.user.email.split("@")[0]}
                      <span className="text-zinc-600"> · {KIND_LABEL[req.kind]}: {req.title}</span>
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                      {req.decidedAt?.toISOString().slice(0, 10)} by {req.decidedBy?.displayName ?? req.decidedBy?.email ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1 border ${
                      req.status === "APPROVED"
                        ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                        : "text-red-400 border-red-500/40 bg-red-500/10"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
