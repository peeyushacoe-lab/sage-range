import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ templateSlug: z.string().min(1) });

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { templateSlug } = parsed.data;

  // Generate a unique 6-char code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.teamSession.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const teamSession = await db.teamSession.create({
    data: {
      code,
      leadId: user.id,
      templateSlug,
      status: "LOBBY",
      members: {
        create: {
          userId: user.id,
          role: "IR_LEAD",
        },
      },
    },
  });

  return NextResponse.json({ id: teamSession.id, code: teamSession.code });
}
