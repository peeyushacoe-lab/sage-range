import { db } from "@/lib/db";
import type { AuditAction, Prisma } from "@prisma/client";

type AuditContext = {
  actorId?: string | null;
  action: AuditAction;
  target?: string | null;
  meta?: Record<string, unknown>;
  req?: Request;
};

export async function audit({ actorId, action, target, meta, req }: AuditContext): Promise<void> {
  const ip = req
    ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null)
    : null;

  db.auditLog.create({
    data: { actorId: actorId ?? null, action, target: target ?? null, meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined, ip },
  }).catch((err) => {
    // Never throw — audit logging must not break the caller
    console.error("[audit] Failed to write log:", err);
  });
}
