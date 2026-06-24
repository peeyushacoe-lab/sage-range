import { db } from "@/lib/db";

export type PlanRole = "STUDENT" | "INSTRUCTOR" | "RECRUITER";

export const PLAN_DEFAULTS: Record<PlanRole, { label: string; priceAmt: number }> = {
  STUDENT:    { label: "Student",    priceAmt: 0    },
  INSTRUCTOR: { label: "Instructor", priceAmt: 2900 },
  RECRUITER:  { label: "Recruiter",  priceAmt: 4900 },
};

export type PlanRow = { role: PlanRole; label: string; priceAmt: number };

/** Returns current prices, seeding defaults for any missing roles. */
export async function getPlanPricing(): Promise<PlanRow[]> {
  const rows = await db.planPricing.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.role, r]));

  const result: PlanRow[] = [];
  for (const role of Object.keys(PLAN_DEFAULTS) as PlanRole[]) {
    if (map[role]) {
      result.push({ role, label: map[role].label, priceAmt: map[role].priceAmt });
    } else {
      // Seed the missing row so next time it's editable
      const def = PLAN_DEFAULTS[role];
      await db.planPricing.create({ data: { role, label: def.label, priceAmt: def.priceAmt } });
      result.push({ role, label: def.label, priceAmt: def.priceAmt });
    }
  }
  return result;
}
