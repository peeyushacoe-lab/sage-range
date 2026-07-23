import { db } from "@/lib/db";

/**
 * Can `viewerId` view the org-lead insights page for `targetUserId`?
 *
 * True if:
 *  - viewer is a platform ADMIN (bypass, for convenience), or
 *  - viewer has an OrganizationMember row with isLead: true whose
 *    organizationId matches one of the target's OrganizationMember rows.
 *
 * A lead can view any member of any organization they lead — including
 * themselves — but cannot view members of organizations they don't lead.
 */
export async function canViewOrgMember(viewerId: string, targetUserId: string): Promise<boolean> {
  if (viewerId === targetUserId) return true;

  const viewer = await db.user.findUnique({ where: { id: viewerId }, select: { role: true } });
  if (viewer?.role === "ADMIN") return true;

  const [leadOrgs, targetOrgs] = await Promise.all([
    db.organizationMember.findMany({
      where: { userId: viewerId, isLead: true },
      select: { organizationId: true },
    }),
    db.organizationMember.findMany({
      where: { userId: targetUserId },
      select: { organizationId: true },
    }),
  ]);

  if (leadOrgs.length === 0 || targetOrgs.length === 0) return false;

  const targetOrgIds = new Set(targetOrgs.map((o) => o.organizationId));
  return leadOrgs.some((o) => targetOrgIds.has(o.organizationId));
}
