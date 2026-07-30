import { db } from "@/lib/db";
import { ApprovalRowActions } from "./_components/approval-row-actions";
import { isSimCertEligible } from "@/lib/sim-certificate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate Approvals — Admin" };

const KIND_LABEL: Record<string, string> = {
  PATH: "Learning Path", ACADEMY: "Academy Course", IR: "IR Commander",
  LABS: "All Labs", SIMULATION: "Simulation Run",
};

type PendingItem = {
  key: string;
  userId: string;
  userName: string;
  userEmail: string;
  kind: "PATH" | "ACADEMY" | "IR" | "LABS" | "SIMULATION";
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

  // ── All-labs completion (100% of currently published labs) ───────────────
  const totalPublishedLabs = await db.lab.count({ where: { published: true } });
  const solvedGroups = totalPublishedLabs > 0
    ? await db.attempt.groupBy({
        by: ["userId"],
        where: { status: "SOLVED", lab: { published: true }, user: { hidden: false } },
        _count: true,
      })
    : [];
  const labsEligibleIds = solvedGroups.filter((g) => g._count >= totalPublishedLabs).map((g) => g.userId);
  const labsUsers = labsEligibleIds.length
    ? await db.user.findMany({ where: { id: { in: labsEligibleIds } }, select: { id: true, displayName: true, email: true } })
    : [];

  // ── Simulation sessions that clear the certificate bar ────────────────────
  const candidateSessions = await db.simulationSession.findMany({
    where: { status: "CONTAINED", user: { hidden: false } },
    select: {
      id: true, userId: true, score: true, status: true, endedAt: true,
      template: { select: { name: true } },
      user: { select: { id: true, displayName: true, email: true } },
    },
  });
  const eligibleSessions = candidateSessions.filter((s) => isSimCertEligible(s.status, s.score ?? 0));

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
    ...labsUsers
      .filter((u) => isOpen(u.id, "LABS", ""))
      .map((u) => ({
        key: `LABS|${u.id}`,
        userId: u.id, userName: u.displayName ?? u.email.split("@")[0], userEmail: u.email,
        kind: "LABS" as const, targetId: "", title: "All Labs Completed", completedAt: null,
      })),
    ...eligibleSessions
      .filter((s) => isOpen(s.userId, "SIMULATION", s.id))
      .map((s) => ({
        key: `SIMULATION|${s.userId}|${s.id}`,
        userId: s.userId, userName: s.user.displayName ?? s.user.email.split("@")[0], userEmail: s.user.email,
        kind: "SIMULATION" as const, targetId: s.id, title: `${s.template.name} (score ${s.score})`, completedAt: s.endedAt,
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
        <p className="text-ink-3 text-sm mt-1">
          Everyone who has completed a path, an Academy course, or met IR Commander requirements appears here until you approve or reject their certificate.
        </p>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">
          Pending {pending.length > 0 && <span className="text-warn">({pending.length})</span>}
        </h2>
        <div className="rounded-xl border border-edge overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-sm text-ink-3 p-5">No pending requests — everyone who&apos;s finished has been decided.</p>
          ) : (
            <div className="divide-y divide-edge-subtle">
              {pending.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {item.userName}
                      <span className="text-ink-3 font-normal"> · {item.userEmail}</span>
                    </p>
                    <p className="text-sm text-ink-2 mt-0.5">
                      <span className="text-ink-3">{KIND_LABEL[item.kind]}:</span> {item.title}
                    </p>
                    {item.completedAt && (
                      <p className="text-xs text-ink-3 mt-1 font-mono">completed {item.completedAt.toISOString().slice(0, 10)}</p>
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
        <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">Recent decisions</h2>
        <div className="rounded-xl border border-edge overflow-hidden">
          {decided.length === 0 ? (
            <p className="text-sm text-ink-3 p-5">No decisions yet.</p>
          ) : (
            <div className="divide-y divide-edge-subtle">
              {decided.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-2">
                      {req.user.displayName ?? req.user.email.split("@")[0]}
                      <span className="text-ink-3"> · {KIND_LABEL[req.kind]}: {req.title}</span>
                    </p>
                    <p className="text-xs text-ink-3 mt-0.5 font-mono">
                      {req.decidedAt?.toISOString().slice(0, 10)} by {req.decidedBy?.displayName ?? req.decidedBy?.email ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1 border ${
                      req.status === "APPROVED"
                        ? "text-ok border-ok-edge bg-ok-wash"
                        : "text-danger border-danger-edge bg-danger-wash"
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
