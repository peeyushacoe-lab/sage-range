import { db } from "@/lib/db";

export type SocialResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): SocialResult<never> => ({
  success: false,
  error,
  statusCode,
});

// ── Following ──────────────────────────────────────────────────────────────

/** Follow a user. Idempotent: following twice is not an error. */
export async function followUser(
  followerId: string,
  followingId: string,
): Promise<SocialResult<{ following: true }>> {
  if (followerId === followingId) return fail("You cannot follow yourself", 400);

  const target = await db.user.findUnique({
    where: { id: followingId },
    select: { id: true },
  });
  if (!target) return fail("User not found", 404);

  await db.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  });

  return { success: true, data: { following: true } };
}

/** Unfollow. Also idempotent — removing a non-existent edge is a no-op. */
export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<SocialResult<{ following: false }>> {
  await db.follow.deleteMany({ where: { followerId, followingId } });
  return { success: true, data: { following: false } };
}

export async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    db.follow.count({ where: { followingId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

export async function isFollowing(followerId: string, followingId: string) {
  const edge = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });
  return edge !== null;
}

export async function listFollowers(userId: string, limit = 50, offset = 0) {
  const rows = await db.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    skip: offset,
  });
  return rows.map((r) => r.follower);
}

export async function listFollowing(userId: string, limit = 50, offset = 0) {
  const rows = await db.follow.findMany({
    where: { followerId: userId },
    include: {
      following: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    skip: offset,
  });
  return rows.map((r) => r.following);
}

// ── Writeup voting ─────────────────────────────────────────────────────────

/**
 * Cast or change a vote. Re-casting the same value clears it, so the button
 * toggles rather than sticking.
 */
export async function voteOnWriteup(params: {
  userId: string;
  writeupId: string;
  value: 1 | -1;
}): Promise<SocialResult<{ score: number; myVote: number }>> {
  if (params.value !== 1 && params.value !== -1) {
    return fail("Vote must be +1 or -1", 400);
  }

  const writeup = await db.writeup.findUnique({
    where: { id: params.writeupId },
    select: { id: true, userId: true },
  });
  if (!writeup) return fail("Writeup not found", 404);
  if (writeup.userId === params.userId) {
    return fail("You cannot vote on your own writeup", 403);
  }

  const existing = await db.writeupVote.findUnique({
    where: { writeupId_userId: { writeupId: params.writeupId, userId: params.userId } },
  });

  // Re-casting the same value clears the vote, so the button toggles.
  const isToggleOff = existing?.value === params.value;
  let myVote: -1 | 0 | 1;

  if (isToggleOff) {
    await db.writeupVote.delete({ where: { id: existing.id } });
    myVote = 0;
  } else {
    await db.writeupVote.upsert({
      where: { writeupId_userId: { writeupId: params.writeupId, userId: params.userId } },
      create: { writeupId: params.writeupId, userId: params.userId, value: params.value },
      update: { value: params.value },
    });
    myVote = params.value;
  }

  const score = await getWriteupScore(params.writeupId);
  return { success: true, data: { score, myVote } };
}

/** Net score across all votes on a writeup. */
export async function getWriteupScore(writeupId: string): Promise<number> {
  const agg = await db.writeupVote.aggregate({
    where: { writeupId },
    _sum: { value: true },
  });
  return agg._sum.value ?? 0;
}

// ── Peer review ────────────────────────────────────────────────────────────

/**
 * Submit a peer review. One review per reviewer per writeup; submitting again
 * updates the existing review rather than stacking duplicates.
 */
export async function submitPeerReview(params: {
  reviewerId: string;
  writeupId: string;
  rating: number;
  comment: string;
}): Promise<SocialResult<{ reviewId: string }>> {
  if (!Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5) {
    return fail("Rating must be a whole number from 1 to 5", 400);
  }
  const comment = params.comment.trim();
  if (comment.length < 20) {
    return fail("Review comment must be at least 20 characters", 400);
  }

  const writeup = await db.writeup.findUnique({
    where: { id: params.writeupId },
    select: { id: true, userId: true },
  });
  if (!writeup) return fail("Writeup not found", 404);
  if (writeup.userId === params.reviewerId) {
    return fail("You cannot review your own writeup", 403);
  }

  const review = await db.peerReview.upsert({
    where: {
      writeupId_reviewerId: {
        writeupId: params.writeupId,
        reviewerId: params.reviewerId,
      },
    },
    create: {
      writeupId: params.writeupId,
      reviewerId: params.reviewerId,
      rating: params.rating,
      comment,
    },
    update: { rating: params.rating, comment },
  });

  return { success: true, data: { reviewId: review.id } };
}

export async function getWriteupReviews(writeupId: string) {
  const reviews = await db.peerReview.findMany({
    where: { writeupId },
    include: {
      reviewer: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
    orderBy: [{ helpful: "desc" }, { createdAt: "desc" }],
  });

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return { reviews, average, count: reviews.length };
}

// ── Mentorship ─────────────────────────────────────────────────────────────

/** Request mentorship. The mentor accepts or declines. */
export async function requestMentorship(params: {
  menteeId: string;
  mentorId: string;
  focus?: string;
}): Promise<SocialResult<{ pairId: string }>> {
  if (params.menteeId === params.mentorId) {
    return fail("You cannot mentor yourself", 400);
  }

  const mentor = await db.user.findUnique({
    where: { id: params.mentorId },
    select: { id: true },
  });
  if (!mentor) return fail("Mentor not found", 404);

  const existing = await db.mentorshipPair.findUnique({
    where: { mentorId_menteeId: { mentorId: params.mentorId, menteeId: params.menteeId } },
  });
  if (existing && ["REQUESTED", "ACTIVE"].includes(existing.status)) {
    return fail("A request is already open with this mentor", 409);
  }

  const pair = await db.mentorshipPair.upsert({
    where: { mentorId_menteeId: { mentorId: params.mentorId, menteeId: params.menteeId } },
    create: {
      mentorId: params.mentorId,
      menteeId: params.menteeId,
      focus: params.focus?.trim() || null,
      status: "REQUESTED",
    },
    update: {
      status: "REQUESTED",
      focus: params.focus?.trim() || null,
      endedAt: null,
    },
  });

  return { success: true, data: { pairId: pair.id } };
}

/** Mentor responds to a pending request. */
export async function respondToMentorship(params: {
  mentorId: string;
  pairId: string;
  accept: boolean;
}): Promise<SocialResult<{ status: string }>> {
  const pair = await db.mentorshipPair.findUnique({ where: { id: params.pairId } });
  if (!pair || pair.mentorId !== params.mentorId) return fail("Request not found", 404);
  if (pair.status !== "REQUESTED") return fail("Request is no longer pending", 409);

  const updated = await db.mentorshipPair.update({
    where: { id: params.pairId },
    data: params.accept
      ? { status: "ACTIVE", startedAt: new Date() }
      : { status: "DECLINED", endedAt: new Date() },
  });

  return { success: true, data: { status: updated.status } };
}

/** Every mentorship touching this user, in either direction. */
export async function listMentorships(userId: string) {
  const [asMentor, asMentee] = await Promise.all([
    db.mentorshipPair.findMany({
      where: { mentorId: userId },
      include: {
        mentee: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.mentorshipPair.findMany({
      where: { menteeId: userId },
      include: {
        mentor: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { asMentor, asMentee };
}
