// Lightweight DB-backed rate limiter for serverless environments.
// Uses existing Prisma connection — no Redis needed.

import { db } from "@/lib/db";

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: Date };

/**
 * Check and increment a rate limit counter.
 * Key format: "action:userId" or "action:sessionId"
 * Uses the RateLimit table (see schema).
 */
export async function rateLimit(
  key: string,
  { max, windowSec }: { max: number; windowSec: number }
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSec * 1000);
  const resetAt = new Date(now.getTime() + windowSec * 1000);

  try {
    // Count recent events within the window
    const count = await db.rateLimitEvent.count({
      where: { key, createdAt: { gte: windowStart } },
    });

    if (count >= max) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // Record this event (fire-and-forget for speed)
    db.rateLimitEvent.create({ data: { key } }).catch(() => null);

    // Periodically clean up old events (1-in-50 chance to keep overhead minimal)
    if (Math.random() < 0.02) {
      const cutoff = new Date(now.getTime() - windowSec * 2 * 1000);
      db.rateLimitEvent.deleteMany({ where: { key, createdAt: { lt: cutoff } } }).catch(() => null);
    }

    return { allowed: true, remaining: max - count - 1, resetAt };
  } catch {
    // On DB error, allow the request (fail open)
    return { allowed: true, remaining: max, resetAt };
  }
}
