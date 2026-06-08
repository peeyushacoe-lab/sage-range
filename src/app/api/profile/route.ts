import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  userId: z.string().min(1),
  displayName: z.string().max(80).optional(),
  university: z.string().max(120).optional(),
  linkedIn: z.string().url().max(300).optional().or(z.literal("")),
  github: z.string().url().max(300).optional().or(z.literal("")),
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string().max(60)).max(30).optional(),
  cvUrl: z.string().url().max(300).optional().or(z.literal("")),
  company: z.string().max(120).optional(),
  jobTitle: z.string().max(120).optional(),
  website: z.string().url().max(300).optional().or(z.literal("")),
  profileExtra: z.record(z.unknown()).optional(),
});

export async function PATCH(req: Request) {



  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const me = await getOrCreateAppUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (me.id !== parsed.data.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId: _id, profileExtra, ...rest } = parsed.data;
  const updated = await db.user.update({
    where: { id: me.id },
    data: {
      ...Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v])
      ),
      ...(profileExtra !== undefined
        ? { profileExtra: JSON.parse(JSON.stringify(profileExtra)) }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, user: { id: updated.id, displayName: updated.displayName } });
}
