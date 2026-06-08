import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, webhookUrl } = await req.json() as { name?: string; webhookUrl?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  let joinCode = makeCode();
  let tries = 0;
  while (tries < 5) {
    const exists = await db.classroom.findUnique({ where: { joinCode } });
    if (!exists) break;
    joinCode = makeCode();
    tries++;
  }

  const classroom = await db.classroom.create({
    data: {
      name: name.trim(),
      joinCode,
      instructorId: user.id,
      ...(webhookUrl?.trim() ? { webhookUrl: webhookUrl.trim() } : {}),
    },
  });

  return NextResponse.json({ id: classroom.id, joinCode: classroom.joinCode });
}
