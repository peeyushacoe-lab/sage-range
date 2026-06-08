import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

function generateCertId(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SR-${year}-${suffix}`;
}

export async function GET() {



  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [qualifyingSims, completedPaths, cert] = await Promise.all([
    db.simulationSession.count({
      where: {
        userId: user.id,
        status: { in: ["CONTAINED", "BREACHED"] },
        score: { gte: 75 },
      },
    }),
    db.userPathProgress.count({
      where: { userId: user.id, completedAt: { not: null } },
    }),
    db.iRCertification.findUnique({ where: { userId: user.id } }),
  ]);

  const simsNeeded = Math.max(0, 3 - qualifyingSims);
  const pathsNeeded = Math.max(0, 2 - completedPaths);
  const eligible = simsNeeded === 0 && pathsNeeded === 0;

  return NextResponse.json({
    eligible,
    certified: !!cert,
    certId: cert?.certId ?? null,
    simsNeeded,
    pathsNeeded,
  });
}

export async function POST() {



  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [qualifyingSims, completedPaths, existing] = await Promise.all([
    db.simulationSession.count({
      where: {
        userId: user.id,
        status: { in: ["CONTAINED", "BREACHED"] },
        score: { gte: 75 },
      },
    }),
    db.userPathProgress.count({
      where: { userId: user.id, completedAt: { not: null } },
    }),
    db.iRCertification.findUnique({ where: { userId: user.id } }),
  ]);

  const simsNeeded = Math.max(0, 3 - qualifyingSims);
  const pathsNeeded = Math.max(0, 2 - completedPaths);
  const eligible = simsNeeded === 0 && pathsNeeded === 0;

  if (existing) {
    return NextResponse.json({
      eligible: true,
      certified: true,
      certId: existing.certId,
      simsNeeded: 0,
      pathsNeeded: 0,
    });
  }

  if (!eligible) {
    return NextResponse.json({
      eligible: false,
      certified: false,
      certId: null,
      simsNeeded,
      pathsNeeded,
    });
  }

  let cert;
  let attempts = 0;
  while (!cert && attempts < 5) {
    attempts++;
    const certId = generateCertId();
    try {
      cert = await db.iRCertification.create({
        data: { userId: user.id, certId },
      });
    } catch {
      cert = undefined;
    }
  }

  if (!cert) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({
    eligible: true,
    certified: true,
    certId: cert.certId,
    simsNeeded: 0,
    pathsNeeded: 0,
  });
}
