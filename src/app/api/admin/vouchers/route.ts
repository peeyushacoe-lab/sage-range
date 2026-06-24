import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

const CreateBody = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  discountPct: z.number().int().min(0).max(100).default(0),
  discountAmt: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).nullable().default(null),
  expiresAt: z.string().optional(),
});

export async function GET() {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vouchers = await db.voucher.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(vouchers);
}

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad_request" }, { status: 400 });
  }

  const { code, discountPct, discountAmt, maxUses, expiresAt } = parsed.data;

  if (discountPct === 0 && discountAmt === 0) {
    return NextResponse.json({ error: "Voucher must have a discount." }, { status: 400 });
  }

  const existing = await db.voucher.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "A voucher with this code already exists." }, { status: 409 });
  }

  const voucher = await db.voucher.create({
    data: {
      code,
      discountPct,
      discountAmt,
      maxUses,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    },
  });

  return NextResponse.json(voucher, { status: 201 });
}
