import { jwtVerify } from "jose";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const ClaimsSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  organization: z.string().min(1),
  cohort: z.string().min(1).optional(),
  role: z.string().optional(),
  // Accepted but intentionally unused for now: Nexus currently sends a free-text
  // name ("Peeyush") with no stable id/email, so there's no reliable way to link
  // it to an actual Org Lead account. Revisit once Nexus can send a linkable
  // identifier for the mentor — lead assignment stays a manual admin step until then.
  mentor: z.string().optional(),
});

export type NexusClaims = z.infer<typeof ClaimsSchema>;

function getSecret() {
  const secret = process.env.NEXUS_SSO_SECRET;
  if (!secret) throw new Error("NEXUS_SSO_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

/** Verifies a Nexus-issued SSO JWT (HS256). Returns null on any invalid, expired, or malformed token. */
export async function verifyNexusToken(token: string): Promise<NexusClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      requiredClaims: ["exp"],
    });
    const parsed = ClaimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function makeCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function uniqueOrgJoinCode() {
  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    if (!(await db.organization.findUnique({ where: { joinCode: code } }))) break;
    code = makeCode();
  }
  return code;
}

async function uniqueCohortJoinCode() {
  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    if (!(await db.cohort.findUnique({ where: { joinCode: code } }))) break;
    code = makeCode();
  }
  return code;
}

/**
 * Finds or creates the User/Organization/Cohort described by verified Nexus
 * claims and links them together. Nexus's JWT signature is the trust boundary —
 * once verified, we provision whatever it describes without further gatekeeping
 * (no seat limits, no admin approval — Nexus already decided this person belongs).
 */
export async function provisionNexusUser(claims: NexusClaims) {
  // 1. Organization — find or create by name (Nexus doesn't send a stable org id yet).
  let org = await db.organization.findFirst({ where: { name: claims.organization } });
  if (!org) {
    org = await db.organization.create({
      data: {
        name: claims.organization,
        contactEmail: claims.email,
        joinCode: await uniqueOrgJoinCode(),
        seats: 100000, // Nexus is the real gatekeeper here, not Forage's seat cap
      },
    });
  }

  // 2. Cohort — optional, scoped to the org, find or create by name.
  let cohort: { id: string } | null = null;
  if (claims.cohort) {
    cohort = await db.cohort.findFirst({ where: { organizationId: org.id, name: claims.cohort } });
    if (!cohort) {
      cohort = await db.cohort.create({
        data: {
          name: claims.cohort,
          organizationId: org.id,
          joinCode: await uniqueCohortJoinCode(),
        },
      });
    }
  }

  // 3. User — link by externalId first (repeat logins), fall back to email
  //    (e.g. they already had a Forage account some other way), else create fresh.
  let user = await db.user.findUnique({ where: { externalId: claims.userId } });
  if (!user) user = await db.user.findUnique({ where: { email: claims.email } });

  const existingExtra = user?.profileExtra && typeof user.profileExtra === "object"
    ? (user.profileExtra as Record<string, unknown>)
    : {};
  const nextExtra = claims.role ? { ...existingExtra, nexusRole: claims.role } : existingExtra;

  if (!user) {
    user = await db.user.create({
      data: {
        email: claims.email,
        externalId: claims.userId,
        displayName: claims.email.split("@")[0],
        role: "STUDENT", // Nexus-provisioned accounts always land as Student in Forage
        profileExtra: nextExtra as Prisma.InputJsonValue,
      },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        externalId: claims.userId, // backfill/confirm the link on every login
        profileExtra: nextExtra as Prisma.InputJsonValue,
      },
    });
  }

  // 4. Org + cohort membership (idempotent).
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    create: { organizationId: org.id, userId: user.id },
    update: {},
  });

  if (cohort) {
    await db.cohortMember.upsert({
      where: { cohortId_userId: { cohortId: cohort.id, userId: user.id } },
      create: { cohortId: cohort.id, userId: user.id },
      update: {},
    });
  }

  return user;
}
