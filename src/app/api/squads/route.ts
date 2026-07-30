import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { createSquad, listSquads } from "@/lib/squads";

const Body = z.object({
  name: z.string().min(3).max(40),
  tag: z.string().min(2).max(6),
  description: z.string().max(1000).optional(),
  joinPolicy: z.enum(["OPEN", "INVITE_ONLY", "CLOSED"]).optional(),
});

/** Public squad directory. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const squads = await listSquads({
    limit: Number.isFinite(limit) ? limit : 20,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  return NextResponse.json({
    squads: squads.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      tag: s.tag,
      description: s.description,
      joinPolicy: s.joinPolicy,
      memberCount: s._count.members,
      maxMembers: s.maxMembers,
    })),
  });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`squad-create:${user.id}`, { max: 5, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const result = await createSquad({ ownerId: user.id, ...parsed.data });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  await audit({
    actorId: user.id,
    action: "SQUAD_CREATE",
    target: result.data.squadId,
    meta: { name: parsed.data.name, tag: parsed.data.tag },
    req,
  });

  return NextResponse.json(result.data, { status: 201 });
}
