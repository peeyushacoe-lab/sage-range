import { db } from "@/lib/db";
import { createBulkNotifications, createNotification } from "@/lib/notifications";
import type { CertKind } from "@prisma/client";

function randCode(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Admin approve/reject decision. Works off the composite (userId, kind,
 * targetId) key so it functions whether or not a CertificateApproval row
 * already exists — the row is upserted to the decided status. On APPROVED it
 * issues the actual certificate record (IR / Academy; PATH has none — its
 * approval status is the gate) and notifies the user with a deep link.
 */
export async function decideCertificate(opts: {
  userId: string;
  kind: CertKind;
  targetId: string;
  title: string;
  decision: "APPROVED" | "REJECTED";
  adminId: string;
}) {
  const { userId, kind, targetId, title, decision, adminId } = opts;

  await db.certificateApproval.upsert({
    where: { userId_kind_targetId: { userId, kind, targetId } },
    update: { status: decision, decidedAt: new Date(), decidedById: adminId, title },
    create: { userId, kind, targetId, title, status: decision, decidedAt: new Date(), decidedById: adminId },
  });

  let viewHref: string | undefined;

  if (decision === "APPROVED") {
    if (kind === "IR") {
      const existing = await db.iRCertification.findUnique({ where: { userId } });
      let certId = existing?.certId ?? null;
      for (let attempt = 0; attempt < 5 && !certId; attempt++) {
        try {
          const cert = await db.iRCertification.create({
            data: { userId, certId: `SR-${new Date().getFullYear()}-${randCode(5)}` },
          });
          certId = cert.certId;
        } catch {
          // certId collision — retry
        }
      }
      if (certId) viewHref = `/verify/${certId}`;
    } else if (kind === "ACADEMY") {
      const cert = await db.academyCertificate.upsert({
        where: { userId_courseId: { userId, courseId: targetId } },
        update: {},
        create: { userId, courseId: targetId, certCode: `SV-${Date.now().toString(36).toUpperCase()}-${randCode(4)}` },
      });
      await db.academyEnrollment.updateMany({
        where: { userId, courseId: targetId, completedAt: null },
        data: { completedAt: new Date() },
      });
      viewHref = `/academy/certificate/${cert.certCode}`;
    } else if (kind === "PATH") {
      const path = await db.learningPath.findUnique({ where: { id: targetId }, select: { slug: true } });
      if (path) viewHref = `/paths/${path.slug}/certificate`;
    } else if (kind === "LABS") {
      viewHref = `/labs/certificate`;
    } else if (kind === "SIMULATION") {
      viewHref = `/simulation/${targetId}/certificate`;
    }
  }

  await createNotification(
    userId,
    decision === "APPROVED" ? "cert_approved" : "cert_rejected",
    decision === "APPROVED" ? "Certificate approved 🎉" : "Certificate request declined",
    decision === "APPROVED"
      ? `Your certificate for "${title}" has been approved and is ready to view.`
      : `Your certificate request for "${title}" was not approved.`,
    viewHref
  );
}

/**
 * Called the moment a user meets a certificate's requirements (path
 * completed, academy course finished, IR eligibility reached). Does NOT
 * grant the certificate — it opens a PENDING approval request and notifies
 * every admin. The certificate itself only becomes visible/claimable once
 * an admin approves it via /admin/certificates.
 *
 * Idempotent: a user only ever gets one approval request per (kind, target),
 * so this is safe to call on every page load / completion check.
 */
export async function requestCertificateApproval(
  userId: string,
  kind: CertKind,
  targetId: string,
  title: string
) {
  const existing = await db.certificateApproval.findUnique({
    where: { userId_kind_targetId: { userId, kind, targetId } },
  });
  if (existing) return existing;

  const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, hidden: true } });

  // Hidden (QA/internal) accounts bypass the approval gate — they exist to
  // exercise the fully-working state, so auto-approve and issue immediately.
  if (user?.hidden) {
    await decideCertificate({ userId, kind, targetId, title, decision: "APPROVED", adminId: userId });
    return db.certificateApproval.findUnique({ where: { userId_kind_targetId: { userId, kind, targetId } } });
  }

  const request = await db.certificateApproval.create({ data: { userId, kind, targetId, title } });

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  const who = user?.displayName ?? user?.email ?? "A user";
  await createBulkNotifications(
    admins.map((a) => a.id),
    "cert_pending_approval",
    "Certificate approval requested",
    `${who} completed "${title}" and is awaiting certificate approval.`,
    "/admin/certificates"
  );

  return request;
}
