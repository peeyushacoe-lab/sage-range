import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getPlanPricing } from "@/lib/plan-pricing";

const UpdateBody = z.array(
  z.object({
    role: z.enum(["STUDENT", "INSTRUCTOR", "RECRUITER"]),
    priceAmt: z.number().int().min(0),
  })
);

export async function GET() {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pricing = await getPlanPricing();
  return NextResponse.json(pricing);
}

export async function PUT(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = UpdateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad_request" }, { status: 400 });
  }

  await Promise.all(
    parsed.data.map(({ role, priceAmt }) =>
      db.planPricing.upsert({
        where: { role },
        update: { priceAmt },
        create: { role, label: role.charAt(0) + role.slice(1).toLowerCase(), priceAmt },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
