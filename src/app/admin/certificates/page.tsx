import { db } from "@/lib/db";
import { ApprovalRowActions } from "./_components/approval-row-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate Approvals — Admin" };

const KIND_LABEL: Record<string, string> = { PATH: "Learning Path", ACADEMY: "Academy Course", IR: "IR Commander" };

type PendingItem = {
  key: string;
  userId: string;
  userName: string;
  userEmail: string;
  kind: "PATH" | "ACADEMY" | "IR";
  targetId: string;
  title: string;
  completedAt: Date | null;
};

export default async function AdminCertificatesPage() {
  // All prior decisions, keyed for O(1) lookup. Pending = completed but not
  // yet APPROVED/REJECTED — derived directly from completion state so the
  // queue is never empty just because a request row was never written.
  const approvals = await db.certificateApproval.findMany();
  const decidedStatus = new Map(approvals.map((a) => [`${a.userId}|${a.kind}|${a.targetId}`, a.status]));
  const isOpen = (userId: string, kind: string, targetId: string) => {
    const s = decidedStatus.get(`${userId}|${kind}|${targetId}`);
    return s === undefined || s === "PENDING";
  };

  // ── Completed paths ──────────────────────────────────────────────────────
  const pathProgress = await db.userPathProgress.findMany({
    where: { completedAt: { not: null }, user: { hidden: false } },
    include: { user: { select: { id: true, displayName: true, email: true } }, path: { select: { id: true, title: true } } },
  });

  // ── Completed academy courses (no cert issued yet) ───────────────────────
  const [enrollments, academyCerts] = await Promise.all([
    db.academyEnrollment.findMany({
      where: { completedAt: { not: null }, user: { hidden: false } },
      include: { user: { select: { id: true, displayName: true, email: true } }, course: { select: { id: true, title: true } } },
    }),
    db.academyCertificate.findMany({ select: { userId: true, courseId: true } }),
  ]);
  const hasAcademyCert = new Set(academyCerts.map((c) => `${c.userId}|${c.courseId}`));

  // ── IR eligibility (>=3 B+ sims AND >=2 completed paths, no cert yet) ─────
  const [simGroups, pathGroups, irCerts] = await Promise.all([
    db.simulationSession.groupBy({ by: ["userId"], where: { status: { in: ["CONTAINED", "BREACHED"] }, score: { gte: 75 } }, _count: true }),
    db.userPathProgress.groupBy({ by: ["userId"], where: { completedAt: { not: null } }, _count: true }),
    db.iRCertification.findMany({ select: { userId: true } }),
  ]);
  const simCount = new Map(simGroups.map((g) => [g.userId, g._count]));
  const pathCount = new Map(pathGroups.map((g) => [g.userId, g._count]));
  const hasIrCert = new Set(irCerts.map((c) => c.userId));
  const irEligibleIds = [...simCount.keys()].filter(
    (uid) => (simCount.get(uid) ?? 0) >= 3 && (pathCount.get(uid) ?? 0) >= 2 && !hasIrCert.has(uid)
  );
  const irUsers = irEligibleIds.length
    ? await db.user.findMany({ where: { id: { in: irEligibleIds }, hidden: false }, select: { id: true, displayName: true, email: true } })
    : [];

  const pending: PendingItem[] = [
    ...pathProgress
      .filter((p) => isOpen(p.userId, "PATH", p.pathId))
      .map((p) => ({
        key: `PATH|${p.userId}|${p.pathId}`,
        userId: p.userId, userName: p.user.displayName ?? p.user.email.split("@")[0], userEmail: p.user.email,
        kind: "PATH" as const, targetId: p.pathId, title: p.path.title, completedAt: p.completedAt,
      })),
    ...enrollments
      .filter((e) => !hasAcademyCert.has(`${e.userId}|${e.courseId}`) && isOpen(e.userId, "ACADEMY", e.courseId))
      .map((e) => ({
        key: `ACADEMY|${e.userId}|${e.courseId}`,
        userId: e.userId, userName: e.user.displayName ?? e.user.email.split("@")[0], userEmail: e.user.email,
        kind: "ACADEMY" as const, targetId: e.courseId, title: e.course.title, completedAt: e.completedAt,
      })),
    ...irUsers
      .filter((u) => isOpen(u.id, "IR", ""))
      .map((u) => ({
        key: `IR|${u.id}`,
        userId: u.id, userName: u.displayName ?? u.email.split("@")[0], userEmail: u.email,
        kind: "IR" as const, targetId: "", title: "IR Commander Certification", completedAt: null,
      })),
  ];

  const decided = await db.certificateApproval.findMany({
    where: { status: { not: "PENDING" } },
    orderBy: { decidedAt: "desc" },
    take: 30,
    include: {
      user: { select: { displayName: true, email: true } },
      decidedBy: { select: { displayName: true, email: true } },
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Certificate Approvals</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Everyone who has completed a path, an Academy course, or met IR Commander requirements appears here until you approve or reject their certificate.
        </p>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
          Pending {pending.length > 0 && <span className="text-amber-400">({pending.length})</span>}
        </h2>
        <div className="rounded-xl border border-white/8 overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-600 p-5">No pending requests — everyone who&apos;s finished has been decided.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {pending.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100">
                      {item.userName}
                      <span className="text-zinc-500 font-normal"> · {item.userEmail}</span>
                    </p>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      <span className="text-zinc-500">{KIND_LABEL[item.kind]}:</span> {item.title}
                    </p>
                    {item.completedAt && (
                      <p className="text-xs text-zinc-600 mt-1 font-mono">completed {item.completedAt.toISOString().slice(0, 10)}</p>
                    )}
                  </div>
                  <ApprovalRowActions userId={item.userId} kind={item.kind} targetId={item.targetId} title={item.title} />
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
