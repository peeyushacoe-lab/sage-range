import { db } from "@/lib/db";

/**
 * Product access was never actually enforced after signup — the pricing
 * wizard's payment step was a client-side UI step with nothing server-side
 * checking whether it was ever completed, so any account (any role) got full,
 * permanent access the moment it was created, paid or not.
 *
 * Every account that existed before this went live keeps whatever access it
 * already had — this only changes what happens for accounts created after it.
 */
export const ACCESS_GATE_STARTS_AT = new Date("2026-08-30T03:06:16.000Z");

export type AccessCheckUser = {
  id: string;
  role: string;
  createdAt: Date;
  subscriptionStatus: string | null;
  externalId: string | null;
  complimentaryAccessUntil: Date | null;
};

/**
 * Whether this user may use the paid product surface. Checked once at
 * sign-in (and on an explicit session refresh) and carried in the JWT, since
 * the edge-compatible middleware config has no database access.
 */
export async function hasProductAccess(user: AccessCheckUser): Promise<boolean> {
  if (user.createdAt < ACCESS_GATE_STARTS_AT) return true; // grandfathered
  if (user.role === "ADMIN") return true;
  if (user.externalId) return true; // Nexus/SSO — licensed by the provisioning org, not Stripe
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") return true;
  // A manually-granted free period (e.g. a Nexus alum who migrated to a
  // personal email) — self-expiring, checked live rather than needing
  // something to flip a status back when it lapses.
  if (user.complimentaryAccessUntil && user.complimentaryAccessUntil > new Date()) return true;

  // Licensed via an organization seat (e.g. a company's own domain-matched
  // team) rather than an individual subscription — this is the intended free
  // path, not a loophole; autoJoinOrganizationByDomain already caps it at
  // org.seats.
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      organization: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    },
    select: { id: true },
  });
  return !!membership;
}
