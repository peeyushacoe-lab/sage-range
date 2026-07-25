import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

function randCode(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const DecisionBody = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = DecisionBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { decision } = parsed.data;

  const request = await db.certificateApproval.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (request.status !== "PENDING") return NextResponse.json({ error: "already_decided" }, { status: 409 });

  await db.certificateApproval.update({
    where: { id },
    data: { status: decision, decidedAt: new Date(), decidedById: admin.id },
  });

  let viewHref: string | undefined;

  if (decision === "APPROVED") {
    if (request.kind === "IR") {
      let certId: string | null = null;
      for (let attempt = 0; attempt < 5 && !certId; attempt++) {
        try {
          const cert = await db.iRCertification.create({
            data: { userId: request.userId, certId: `SR-${new Date().getFullYear()}-${randCode(5)}` },
          });
          certId = cert.certId;
        } catch {
          // certId collision — retry
        }
      }
      if (certId) viewHref = `/verify/${certId}`;
    } else if (request.kind === "ACADEMY") {
      const cert = await db.academyCertificate.upsert({
        where: { userId_courseId: { userId: request.userId, courseId: request.targetId } },
        update: {},
        create: {
          userId: request.userId,
          courseId: request.targetId,
          certCode: `SV-${Date.now().toString(36).toUpperCase()}-${randCode(4)}`,
        },
      });
      await db.academyEnrollment.updateMany({
        where: { userId: request.userId, courseId: request.targetId, completedAt: null },
        data: { completedAt: new Date() },
      });
      viewHref = `/academy/certificate/${cert.certCode}`;
    } else {
      // PATH: no separate certificate record — approval status itself gates
      // /paths/[slug]/certificate.
      const path = await db.learningPath.findUnique({ where: { id: request.targetId }, select: { slug: true } });
      if (path) viewHref = `/paths/${path.slug}/certificate`;
    }
  }

  await createNotification(
    request.userId,
    decision === "APPROVED" ? "cert_approved" : "cert_rejected",
    decision === "APPROVED" ? "Certificate approved 🎉" : "Certificate request declined",
    decision === "APPROVED"
      ? `Your certificate for "${request.title}" has been approved and is ready to view.`
      : `Your certificate request for "${request.title}" was not approved.`,
    viewHref
  );

  return NextResponse.json({ ok: true });
}
