import { db } from "@/lib/db";
import type { SquadRole } from "@prisma/client";

/** How long a pending invite stays actionable. */
const INVITE_TTL_DAYS = 14;

export type SquadResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): SquadResult<never> => ({
  success: false,
  error,
  statusCode,
});

/** URL-safe slug base; uniqueness is resolved by the caller. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSquadSlug(name: string): Promise<string> {
  const base = slugify(name) || "squad";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await db.squad.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Rank ordering for permission checks. A member may act on another member only
 * when strictly outranking them, which stops officers removing each other.
 */
const ROLE_RANK: Record<SquadRole, number> = {
  OWNER: 3,
  OFFICER: 2,
  MEMBER: 1,
};

export async function getMembership(userId: string) {
  return db.squadMember.findUnique({
    where: { userId },
    include: { squad: true },
  });
}

/**
 * Create a squad and enrol the creator as OWNER.
 *
 * A user may only belong to one squad, enforced by the unique index on
 * SquadMember.userId and re-checked here so the caller gets a clear error
 * rather than a constraint violation.
 */
export async function createSquad(params: {
  ownerId: string;
  name: string;
  tag: string;
  description?: string;
  joinPolicy?: "OPEN" | "INVITE_ONLY" | "CLOSED";
}): Promise<SquadResult<{ squadId: string; slug: string }>> {
  const name = params.name.trim();
  const tag = params.tag.trim().toUpperCase();

  if (name.length < 3 || name.length > 40) {
    return fail("Squad name must be 3-40 characters", 400);
  }
  if (!/^[A-Z0-9]{2,6}$/.test(tag)) {
    return fail("Tag must be 2-6 letters or digits", 400);
  }

  const existing = await getMembership(params.ownerId);
  if (existing) return fail("You already belong to a squad", 409);

  const slug = await uniqueSquadSlug(name);

  const squad = await db.$transaction(async (tx) => {
    const created = await tx.squad.create({
      data: {
        slug,
        name,
        tag,
        description: params.description?.trim() || null,
        ownerId: params.ownerId,
        joinPolicy: params.joinPolicy ?? "INVITE_ONLY",
      },
    });
    await tx.squadMember.create({
      data: { squadId: created.id, userId: params.ownerId, role: "OWNER" },
    });
    return created;
  });

  return { success: true, data: { squadId: squad.id, slug: squad.slug } };
}

/** Join an OPEN squad directly. INVITE_ONLY and CLOSED squads reject this. */
export async function joinSquad(
  userId: string,
  squadId: string,
): Promise<SquadResult<{ squadId: string }>> {
  const squad = await db.squad.findUnique({
    where: { id: squadId },
    include: { _count: { select: { members: true } } },
  });

  if (!squad || squad.disbandedAt) return fail("Squad not found", 404);
  if (squad.joinPolicy !== "OPEN") return fail("This squad is invite only", 403);
  if (squad._count.members >= squad.maxMembers) return fail("Squad is full", 409);

  const existing = await getMembership(userId);
  if (existing) return fail("You already belong to a squad", 409);

  await db.squadMember.create({ data: { squadId, userId, role: "MEMBER" } });
  return { success: true, data: { squadId } };
}

/** Invite a user. Only OWNER and OFFICER may invite. */
export async function inviteToSquad(params: {
  inviterId: string;
  inviteeId: string;
  squadId: string;
}): Promise<SquadResult<{ inviteId: string }>> {
  const inviter = await db.squadMember.findUnique({
    where: { squadId_userId: { squadId: params.squadId, userId: params.inviterId } },
  });
  if (!inviter) return fail("You are not in this squad", 403);
  if (ROLE_RANK[inviter.role] < ROLE_RANK.OFFICER) {
    return fail("Only officers and the owner can invite", 403);
  }
  if (params.inviteeId === params.inviterId) {
    return fail("You cannot invite yourself", 400);
  }

  const alreadyMember = await getMembership(params.inviteeId);
  if (alreadyMember) return fail("That user already belongs to a squad", 409);

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  // The unique key is (squadId, inviteeId, status), so a fresh PENDING invite
  // replaces a previous PENDING one rather than colliding with it.
  const invite = await db.squadInvite.upsert({
    where: {
      squadId_inviteeId_status: {
        squadId: params.squadId,
        inviteeId: params.inviteeId,
        status: "PENDING",
      },
    },
    create: {
      squadId: params.squadId,
      inviteeId: params.inviteeId,
      invitedById: params.inviterId,
      expiresAt,
    },
    update: { expiresAt, invitedById: params.inviterId },
  });

  return { success: true, data: { inviteId: invite.id } };
}

/** Accept a pending, unexpired invite. */
export async function acceptInvite(
  userId: string,
  inviteId: string,
): Promise<SquadResult<{ squadId: string }>> {
  const invite = await db.squadInvite.findUnique({
    where: { id: inviteId },
    include: { squad: { include: { _count: { select: { members: true } } } } },
  });

  if (!invite || invite.inviteeId !== userId) return fail("Invite not found", 404);
  if (invite.status !== "PENDING") return fail("Invite is no longer pending", 409);
  if (invite.expiresAt <= new Date()) {
    await db.squadInvite.update({
      where: { id: inviteId },
      data: { status: "EXPIRED", respondedAt: new Date() },
    });
    return fail("Invite has expired", 410);
  }
  if (invite.squad.disbandedAt) return fail("Squad no longer exists", 404);
  if (invite.squad._count.members >= invite.squad.maxMembers) {
    return fail("Squad is full", 409);
  }

  const existing = await getMembership(userId);
  if (existing) return fail("You already belong to a squad", 409);

  await db.$transaction([
    db.squadMember.create({
      data: { squadId: invite.squadId, userId, role: "MEMBER" },
    }),
    db.squadInvite.update({
      where: { id: inviteId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
  ]);

  return { success: true, data: { squadId: invite.squadId } };
}

export async function declineInvite(
  userId: string,
  inviteId: string,
): Promise<SquadResult<null>> {
  const invite = await db.squadInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.inviteeId !== userId) return fail("Invite not found", 404);
  if (invite.status !== "PENDING") return fail("Invite is no longer pending", 409);

  await db.squadInvite.update({
    where: { id: inviteId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  return { success: true, data: null };
}

/**
 * Leave a squad. The owner cannot simply leave — they must transfer ownership
 * or disband, otherwise the squad would be left without an owner.
 */
export async function leaveSquad(userId: string): Promise<SquadResult<null>> {
  const membership = await getMembership(userId);
  if (!membership) return fail("You are not in a squad", 404);
  if (membership.role === "OWNER") {
    return fail("Transfer ownership or disband the squad first", 409);
  }

  await db.squadMember.delete({ where: { userId } });
  return { success: true, data: null };
}

/** Remove another member. Requires strictly outranking the target. */
export async function removeMember(params: {
  actorId: string;
  targetUserId: string;
}): Promise<SquadResult<null>> {
  const actor = await getMembership(params.actorId);
  if (!actor) return fail("You are not in a squad", 403);

  const target = await db.squadMember.findUnique({
    where: { userId: params.targetUserId },
  });
  if (!target || target.squadId !== actor.squadId) {
    return fail("That user is not in your squad", 404);
  }
  if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
    return fail("You cannot remove someone of equal or higher rank", 403);
  }

  await db.squadMember.delete({ where: { userId: params.targetUserId } });
  return { success: true, data: null };
}

/** Transfer ownership; the previous owner stays on as an officer. */
export async function transferOwnership(params: {
  ownerId: string;
  newOwnerId: string;
}): Promise<SquadResult<null>> {
  const owner = await getMembership(params.ownerId);
  if (!owner || owner.role !== "OWNER") return fail("Only the owner can transfer", 403);

  const target = await db.squadMember.findUnique({ where: { userId: params.newOwnerId } });
  if (!target || target.squadId !== owner.squadId) {
    return fail("That user is not in your squad", 404);
  }

  await db.$transaction([
    db.squadMember.update({ where: { userId: params.newOwnerId }, data: { role: "OWNER" } }),
    db.squadMember.update({ where: { userId: params.ownerId }, data: { role: "OFFICER" } }),
    db.squad.update({ where: { id: owner.squadId }, data: { ownerId: params.newOwnerId } }),
  ]);

  return { success: true, data: null };
}

/**
 * Soft-disband: keeps the squad row for historical leaderboards and tournament
 * records while freeing every member to join elsewhere.
 */
export async function disbandSquad(ownerId: string): Promise<SquadResult<null>> {
  const owner = await getMembership(ownerId);
  if (!owner || owner.role !== "OWNER") return fail("Only the owner can disband", 403);

  await db.$transaction([
    db.squadMember.deleteMany({ where: { squadId: owner.squadId } }),
    db.squadInvite.updateMany({
      where: { squadId: owner.squadId, status: "PENDING" },
      data: { status: "EXPIRED", respondedAt: new Date() },
    }),
    db.squad.update({
      where: { id: owner.squadId },
      data: { disbandedAt: new Date() },
    }),
  ]);

  return { success: true, data: null };
}

/** Public squad view with roster. */
export async function getSquadBySlug(slug: string) {
  return db.squad.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      _count: { select: { members: true } },
    },
  });
}

/** Directory of joinable squads, most recently formed first. */
export async function listSquads(params: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(params.limit ?? 20, 100);
  return db.squad.findMany({
    where: { disbandedAt: null, joinPolicy: { in: ["OPEN", "INVITE_ONLY"] } },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: params.offset ?? 0,
  });
}

/** Squad ladder for a season, ordered by stored rank then points. */
export async function getSquadSeasonLeaderboard(seasonId: string, limit = 100) {
  const rows = await db.squadSeasonStat.findMany({
    where: { seasonId },
    include: { squad: { select: { id: true, slug: true, name: true, tag: true } } },
    orderBy: [{ points: "desc" }, { wins: "desc" }],
    take: limit,
  });

  return rows.map((row, index) => ({
    squadId: row.squadId,
    slug: row.squad.slug,
    name: row.squad.name,
    tag: row.squad.tag,
    points: row.points,
    wins: row.wins,
    losses: row.losses,
    rank: row.rank ?? index + 1,
  }));
}
