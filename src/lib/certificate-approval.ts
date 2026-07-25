import { db } from "@/lib/db";
import { createBulkNotifications } from "@/lib/notifications";
import type { CertKind } from "@prisma/client";

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

  const [user, request] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true } }),
    db.certificateApproval.create({ data: { userId, kind, targetId, title } }),
  ]);

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
