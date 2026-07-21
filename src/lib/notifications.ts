import { db } from "@/lib/db";

export type NotificationType =
  | "lab_assigned"
  | "sim_complete"
  | "badge_earned"
  | "writeup_approved"
  | "writeup_rejected"
  | "scenario_published"
  | "competition_start"
  | "announcement";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  href?: string
) {
  return db.notification.create({ data: { userId, type, title, body, href } });
}

export async function createBulkNotifications(
  userIds: string[],
  type: NotificationType,
  title: string,
  body?: string,
  href?: string
) {
  if (userIds.length === 0) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, title, body, href })),
    skipDuplicates: true,
  });
}
