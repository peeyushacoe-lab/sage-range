import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

function csvEscape(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id, isLead: true },
    include: { organization: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden — org lead access required" }, { status: 403 });

  const members = await db.organizationMember.findMany({
    where: { organizationId: membership.organizationId },
    include: { user: { select: { id: true, displayName: true, email: true, role: true, skillScore: true, xp: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const rows = await Promise.all(
    members.map(async (m) => {
      const [labsSolved, pathsCompleted, simsCompleted] = await Promise.all([
        db.attempt.count({ where: { userId: m.user.id, status: "SOLVED" } }),
        db.userPathProgress.count({ where: { userId: m.user.id, completedAt: { not: null } } }),
        db.simulationSession.count({ where: { userId: m.user.id, endedAt: { not: null } } }),
      ]);
      return [
        m.user.displayName ?? "",
        m.user.email,
        m.user.role,
        m.isLead ? "Lead" : "Member",
        m.user.skillScore,
        m.user.xp,
        labsSolved,
        pathsCompleted,
        simsCompleted,
        m.joinedAt.toISOString().slice(0, 10),
      ];
    })
  );

  const header = ["Name", "Email", "Role", "Org Role", "Skill Score", "XP", "Labs Solved", "Paths Completed", "Simulations Completed", "Joined"];
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  const filename = `${membership.organization.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-export.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
