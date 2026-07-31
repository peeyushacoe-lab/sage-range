import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import {
  canAccessCompetition,
  loadViewerContext,
  type CompetitionVisibility,
} from "@/lib/competition-access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const competition = await db.competition.findUnique({ where: { slug } });
  if (!competition || !competition.published) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Enforce visibility on the write path too — a restricted competition must
  // not be joinable by POSTing its slug directly. Invite-only events are
  // entered through /api/competitions/redeem, which checks the code.
  const existing = await db.competitionEntry.findUnique({
    where: { competitionId_userId: { competitionId: competition.id, userId: user.id } },
    select: { id: true },
  });
  const viewer = await loadViewerContext(user.id);
  const allowed = canAccessCompetition(
    {
      visibility: competition.visibility as CompetitionVisibility,
      organizationId: competition.organizationId,
      cohortId: competition.cohortId,
      inviteCode: competition.inviteCode,
    },
    { ...viewer, hasEntry: existing != null },
  );
  if (!allowed) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = new Date();
  if (now < competition.startDate || now > competition.endDate) {
    return NextResponse.json({ error: "competition_not_active" }, { status: 400 });
  }

  const entry = await db.competitionEntry.upsert({
    where: { competitionId_userId: { competitionId: competition.id, userId: user.id } },
    create: { competitionId: competition.id, userId: user.id, score: 0 },
    update: {},
    select: { id: true },
  });

  return NextResponse.json({ id: entry.id });
}
