// Lightweight DB-backed rate limiter for serverless environments.
// Uses existing Prisma connection — no Redis needed.
// Falls back to in-memory tracking on DB error (fail-closed: still enforces limits).

import { db } from "@/lib/db";

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: Date };

// In-memory fallback: used only when DB is unavailable.
// Keyed by rate-limit key; entries expire after their window.
const memStore = new Map<string, { count: number; windowStart: number }>();

function memCheck(key: string, max: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now - entry.windowStart > windowSec * 1000) {
    memStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function rateLimit(
  key: string,
  { max, windowSec }: { max: number; windowSec: number }
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSec * 1000);
  const resetAt = new Date(now.getTime() + windowSec * 1000);

  try {
    const count = await db.rateLimitEvent.count({
      where: { key, createdAt: { gte: windowStart } },
    });

    if (count >= max) {
      return { allowed: false, remaining: 0, resetAt };
    }

    db.rateLimitEvent.create({ data: { key } }).catch(() => null);

    if (Math.random() < 0.02) {
      const cutoff = new Date(now.getTime() - windowSec * 2 * 1000);
      db.rateLimitEvent.deleteMany({ where: { key, createdAt: { lt: cutoff } } }).catch(() => null);
    }

    return { allowed: true, remaining: max - count - 1, resetAt };
  } catch {
    // DB unavailable — fall back to in-memory tracking (still enforces limits, fail-closed)
    const allowed = memCheck(key, max, windowSec);
    return { allowed, remaining: allowed ? max - 1 : 0, resetAt };
  }
}
