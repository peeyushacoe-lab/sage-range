import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { Difficulty } from "@prisma/client";

const CreateWeeklyCaseBody = z.object({
  season: z.number().int().min(2020).max(2100),
  weekNumber: z.number().int().min(1).max(52),
  incidentSlug: z.string().min(1).max(255),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]),
  points: z.number().int().min(100).max(5000).optional().default(1000),
  releaseTime: z.string().datetime(), // ISO 8601
  deadlineTime: z.string().datetime(), // ISO 8601
  published: z.boolean().optional().default(false),
});

/**
 * POST /api/admin/incidents/weekly/create
 * Admin-only endpoint to create a new weekly incident case.
 *
 * The case is created in unpublished state. Publication can be done via the admin UI
 * or via a background job that releases cases on schedule.
 *
 * Request body:
 * {
 *   "season": 2026,
 *   "weekNumber": 1,
 *   "incidentSlug": "incident-slug",
 *   "difficulty": "EASY",
 *   "points": 1000,
 *   "releaseTime": "2026-01-05T00:00:00Z",
 *   "deadlineTime": "2026-01-12T23:59:00Z",
 *   "published": false
 * }
 *
 * Response (201):
 * {
 *   "id": "string",
 *   "season": 2026,
 *   "weekNumber": 1,
 *   "incidentSlug": "incident-slug",
 *   "difficulty": "EASY",
 *   "releaseTime": "2026-01-05T00:00:00Z",
 *   "deadlineTime": "2026-01-12T23:59:00Z",
 *   "published": false
 * }
 *
 * Response (400): Invalid request body
 * Response (403): Not an admin
 * Response (409): Case already exists for season/week combination
 */
export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Only admins can create weekly cases
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = CreateWeeklyCaseBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate that the referenced incident exists
  const incident = await db.incidentSimulation.findUnique({
    where: { slug: data.incidentSlug },
  });
  if (!incident) {
    return NextResponse.json(
      {
        error: "incident_not_found",
        message: `Incident simulation with slug '${data.incidentSlug}' does not exist`,
      },
      { status: 400 }
    );
  }

  // Check if a case already exists for this season/week
  const existing = await db.weeklyIncidentCase.findFirst({
    where: {
      season: data.season,
      weekNumber: data.weekNumber,
    },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "conflict",
        message: `Weekly case already exists for season ${data.season}, week ${data.weekNumber}`,
        existingId: existing.id,
      },
      { status: 409 }
    );
  }

  // Validate deadline is after release time
  const releaseTime = new Date(data.releaseTime);
  const deadlineTime = new Date(data.deadlineTime);
  if (deadlineTime <= releaseTime) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Deadline must be after release time",
      },
      { status: 400 }
    );
  }

  // Create the case
  const case_ = await db.weeklyIncidentCase.create({
    data: {
      season: data.season,
      weekNumber: data.weekNumber,
      weekStartUTC: releaseTime, // Store the Monday 00:00 UTC timestamp
      incidentSlug: data.incidentSlug,
      difficulty: data.difficulty as Difficulty,
      points: data.points,
      releaseTime,
      deadlineTime,
      published: data.published,
    },
  });

  audit({
    actorId: user.id,
    action: "INCIDENT_WEEKLY_CREATE",
    target: case_.id,
    req,
    meta: {
      season: data.season,
      weekNumber: data.weekNumber,
      incidentSlug: data.incidentSlug,
      difficulty: data.difficulty,
      published: data.published,
    },
  });

  return NextResponse.json(
    {
      id: case_.id,
      season: case_.season,
      weekNumber: case_.weekNumber,
      incidentSlug: case_.incidentSlug,
      difficulty: case_.difficulty,
      points: case_.points,
      releaseTime: case_.releaseTime.toISOString(),
      deadlineTime: case_.deadlineTime.toISOString(),
      published: case_.published,
    },
    { status: 201 }
  );
}
