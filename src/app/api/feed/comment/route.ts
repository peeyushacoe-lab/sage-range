import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const VALID_ENTRY_TYPES = new Set(["lab_solved", "sim_completed"]);

const Body = z.object({
  entryId: z.string().min(1),
  entryType: z.string().refine((v) => VALID_ENTRY_TYPES.has(v)),
  body: z.string().trim().min(1).max(500),
});

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { entryId, entryType, body } = parsed.data;

  const comment = await db.feedComment.create({
    data: { userId: me.id, entryId, entryType, body },
  });

  return NextResponse.json({
    id: comment.id,
    userId: me.id,
    displayName: me.displayName,
    email: me.email,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  });
}
