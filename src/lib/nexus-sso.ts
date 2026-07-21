import { jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const ClaimsSchema = z.object({
  sub: z.string().min(1),       // Nexus sends standard JWT "sub" for the user id
  email: z.string().email(),
  organization: z.string().min(1),
  cohort: z.string().min(1).optional(),
  role: z.string().optional(),
  mentor: z.string().optional(),
}).transform((d) => ({ ...d, userId: d.sub })); // expose as userId for the rest of the code

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

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(len = 8): string {
  return Array.from(randomBytes(len), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
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
  // Nexus sends a display name, not a stable org ID — match case-insensitively to prevent
  // duplicate orgs from minor name differences. TODO: require stable org ID in JWT.
  let org = await db.organization.findFirst({
    where: { name: { equals: claims.organization, mode: "insensitive" } },
  });
  if (!org) {
    // Seat count comes from env so it can be configured per deployment tier
    const seats = parseInt(process.env.NEXUS_SSO_ORG_SEATS ?? "500", 10);
    org = await db.organization.create({
      data: {
        name: claims.organization,
        contactEmail: claims.email,
        joinCode: await uniqueOrgJoinCode(),
        seats,
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
