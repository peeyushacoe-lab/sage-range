import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { requestCertificateApproval } from "@/lib/certificate-approval";

async function eligibility(userId: string) {
  const [qualifyingSims, completedPaths, cert, request] = await Promise.all([
    db.simulationSession.count({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] }, score: { gte: 75 } },
    }),
    db.userPathProgress.count({ where: { userId, completedAt: { not: null } } }),
    db.iRCertification.findUnique({ where: { userId } }),
    db.certificateApproval.findUnique({ where: { userId_kind_targetId: { userId, kind: "IR", targetId: "" } } }),
  ]);

  const simsNeeded = Math.max(0, 3 - qualifyingSims);
  const pathsNeeded = Math.max(0, 2 - completedPaths);
  const eligible = simsNeeded === 0 && pathsNeeded === 0;

  return { simsNeeded, pathsNeeded, eligible, cert, request };
}

export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { simsNeeded, pathsNeeded, eligible, cert, request } = await eligibility(user.id);

  return NextResponse.json({
    eligible,
    certified: !!cert,
    certId: cert?.certId ?? null,
    approvalStatus: request?.status ?? null,
    simsNeeded,
    pathsNeeded,
  });
}

// Requirements met -> opens a PENDING approval request (or returns the
// existing one). The certificate itself is only created once an admin
// approves it via /admin/certificates — see requestCertificateApproval().
export async function POST() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { simsNeeded, pathsNeeded, eligible, cert } = await eligibility(user.id);

  if (cert) {
    return NextResponse.json({
      eligible: true, certified: true, certId: cert.certId, approvalStatus: "APPROVED", simsNeeded: 0, pathsNeeded: 0,
    });
  }

  if (!eligible) {
    return NextResponse.json({
      eligible: false, certified: false, certId: null, approvalStatus: null, simsNeeded, pathsNeeded,
    });
  }

  const request = await requestCertificateApproval(user.id, "IR", "", "IR Commander Certification");

  // Hidden accounts auto-approve — re-read so we report the real cert/status.
  const issuedCert = await db.iRCertification.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    eligible: true,
    certified: !!issuedCert,
    certId: issuedCert?.certId ?? null,
    approvalStatus: issuedCert ? "APPROVED" : request?.status ?? "PENDING",
    simsNeeded: 0,
    pathsNeeded: 0,
  });
}
