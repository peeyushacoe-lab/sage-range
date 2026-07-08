import { db } from "@/lib/db";

/**
 * Auto-joins a newly created user to an Organization if their email domain
 * matches a registered Organization.domain. Best-effort: silently no-ops if
 * there's no match, the org is inactive/expired, or seats are full — none of
 * these should ever block account creation.
 */
export async function autoJoinOrganizationByDomain(userId: string, email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return;

  const org = await db.organization.findUnique({ where: { domain } });
  if (!org || !org.active) return;
  if (org.expiresAt && org.expiresAt < new Date()) return;

  const memberCount = await db.organizationMember.count({ where: { organizationId: org.id } });
  if (memberCount >= org.seats) return;

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId } },
    create: { organizationId: org.id, userId },
    update: {},
  });
}
