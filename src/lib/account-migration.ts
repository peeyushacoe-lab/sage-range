/**
 * Nexus alumni -> personal email account migration.
 *
 * The problem this solves: an intern's account is keyed by their Nexus-
 * issued email (externalId set, provisioned by provisionNexusUser). Once
 * they lose Nexus access, signing in with a personal Gmail via Google OAuth
 * would NOT reach that account — auth.ts's signIn callback matches by
 * email, so a different email just creates a brand new, empty one. This
 * changes the existing account's email in place instead, so the same id,
 * history, evidence, certificates, everything carries over.
 *
 * Two-step, not instant: starting a migration only sends a verification
 * link to the NEW email — nothing changes until that's clicked. That's the
 * actual security boundary (proving they own the personal inbox), not just
 * a UX nicety.
 */

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendMigrationVerificationEmail } from "@/lib/email";

export type MigrationResult<T> = { success: true; data: T } | { success: false; error: string; statusCode: number };
const fail = (error: string, statusCode: number): MigrationResult<never> => ({ success: false, error, statusCode });

const TOKEN_TTL_HOURS = 24;
/** How much free access a completed migration grants, from the moment it completes. */
export const MIGRATION_GRANT_MONTHS = 6;

function makeToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Start a migration: only allowed for a currently Nexus-provisioned account
 * (externalId set) — this isn't a general email-change feature, it's
 * specifically for people about to lose that access.
 */
export async function startMigration(userId: string, newEmail: string): Promise<MigrationResult<{ requestId: string }>> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Account not found", 404);
  if (!user.externalId) return fail("This isn't a Nexus-provisioned account — nothing to migrate", 403);

  const normalized = newEmail.trim().toLowerCase();
  if (normalized === user.email.toLowerCase()) return fail("That's already your current email", 400);

  const taken = await db.user.findUnique({ where: { email: normalized } });
  if (taken) return fail("That email is already in use by another Sage Vault account", 409);

  // Superseding any earlier, unfinished request for this account rather than
  // stacking — only the most recent link should actually work.
  await db.accountMigrationRequest.updateMany({
    where: { userId, completedAt: null },
    data: { expiresAt: new Date() },
  });

  const request = await db.accountMigrationRequest.create({
    data: {
      userId,
      newEmail: normalized,
      token: makeToken(),
      expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  try {
    await sendMigrationVerificationEmail(normalized, {
      displayName: user.displayName ?? user.email.split("@")[0],
      token: request.token,
    });
  } catch (err) {
    console.error("[account-migration] failed to send verification email:", err);
    return fail("We couldn't send the confirmation email — please try again in a moment", 502);
  }

  await audit({ actorId: userId, action: "ACCOUNT_MIGRATION_STARTED", target: userId, meta: { newEmail: normalized } });

  return { success: true, data: { requestId: request.id } };
}

export async function getMigrationRequestByToken(token: string) {
  return db.accountMigrationRequest.findUnique({ where: { token }, include: { user: true } });
}

/**
 * Finalize: change the email, drop the Nexus link (they're licensed by the
 * org no longer, and hasProductAccess treats externalId as an indefinite
 * free pass — leaving it set would grant permanent access, not the 6-month
 * grant this is supposed to be), and start the complimentary period.
 */
export async function confirmMigration(token: string): Promise<MigrationResult<{ email: string }>> {
  const request = await db.accountMigrationRequest.findUnique({ where: { token } });
  if (!request) return fail("This migration link is invalid", 404);
  if (request.completedAt) return fail("This migration link has already been used", 409);
  if (request.expiresAt < new Date()) return fail("This migration link has expired — start again from your dashboard", 410);

  // Re-check at confirm time too, not just at start time — someone else
  // could have taken the email in between.
  const taken = await db.user.findUnique({ where: { email: request.newEmail } });
  if (taken) return fail("That email is already in use by another Sage Vault account", 409);

  const grantUntil = new Date();
  grantUntil.setMonth(grantUntil.getMonth() + MIGRATION_GRANT_MONTHS);

  await db.$transaction([
    db.user.update({
      where: { id: request.userId },
      data: {
        email: request.newEmail,
        externalId: null,
        complimentaryAccessUntil: grantUntil,
      },
    }),
    db.accountMigrationRequest.update({
      where: { id: request.id },
      data: { completedAt: new Date() },
    }),
  ]);

  await audit({
    actorId: request.userId,
    action: "ACCOUNT_MIGRATION_COMPLETED",
    target: request.userId,
    meta: { newEmail: request.newEmail, complimentaryAccessUntil: grantUntil.toISOString() },
  });

  return { success: true, data: { email: request.newEmail } };
}
