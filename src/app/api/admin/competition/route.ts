import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  freezeAt: z.string().datetime().optional(),
  prizeDesc: z.string().max(500).optional(),
  labSlugs: z.array(z.string()).min(1),
  visibility: z
    .enum(["PUBLIC", "ORGANIZATION", "COHORT", "INVITE_ONLY"])
    .default("PUBLIC"),
  organizationId: z.string().optional(),
  cohortId: z.string().optional(),
});

/** Invite codes avoid I/O/0/1 so they survive being read aloud or retyped. */
function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SV-${out}`;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });
  }

  const {
    name, description, startDate, endDate, freezeAt, prizeDesc, labSlugs,
    visibility, organizationId, cohortId,
  } = parsed.data;
  const slug = toSlug(name);

  // Reject a restricted competition that names no audience. Access checks fail
  // closed, so such a row would be invisible to everyone including its owner —
  // failing here makes the mistake obvious at creation instead.
  if (visibility === "ORGANIZATION" && !organizationId) {
    return NextResponse.json(
      { error: "organizationId is required for an ORGANIZATION competition" },
      { status: 400 },
    );
  }
  if (visibility === "COHORT" && !cohortId) {
    return NextResponse.json(
      { error: "cohortId is required for a COHORT competition" },
      { status: 400 },
    );
  }

  // Verify the referenced audience exists, so a typo cannot create an event
  // nobody can reach.
  if (organizationId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "organization not found" }, { status: 400 });
    }
  }
  if (cohortId) {
    const cohort = await db.cohort.findUnique({
      where: { id: cohortId },
      select: { id: true },
    });
    if (!cohort) {
      return NextResponse.json({ error: "cohort not found" }, { status: 400 });
    }
  }

  const competition = await db.competition.create({
    data: {
      name,
      slug,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...(freezeAt && { freezeAt: new Date(freezeAt) }),
      ...(prizeDesc && { prizeDesc }),
      labSlugs,
      published: false,
      visibility,
      organizationId: visibility === "ORGANIZATION" ? organizationId : null,
      cohortId: visibility === "COHORT" ? cohortId : null,
      inviteCode: visibility === "INVITE_ONLY" ? generateInviteCode() : null,
    },
    select: { id: true, slug: true, visibility: true, inviteCode: true },
  });

  return NextResponse.json(competition);
}
