import { db } from "./db";
import type { Prisma } from "@prisma/client";

/**
 * Fire-and-forget event tracking. Never blocks a request.
 * Query via: SELECT event, count(*), avg((properties->>'score')::int)
 *            FROM "AnalyticsEvent" GROUP BY event;
 */
export function track(
  event: string,
  userId: string | null | undefined,
  properties: Record<string, unknown> = {}
): void {
  db.analyticsEvent
    .create({ data: { event, userId: userId ?? null, properties: properties as Prisma.InputJsonValue } })
    .catch(() => null);
}
