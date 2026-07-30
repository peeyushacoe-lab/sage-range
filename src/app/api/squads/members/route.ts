import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { audit } from "@/lib/audit";
import {
  getMembership,
  joinSquad,
  leaveSquad,
  removeMember,
  transferOwnership,
} from "@/lib/squads";

const PostBody = z.object({ squadId: z.string().min(1) });

const PatchBody = z.object({
  action: z.enum(["REMOVE", "TRANSFER_OWNERSHIP"]),
  targetUserId: z.string().min(1),
});

/** The caller's own membership, or null. */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(user.id);
  if (!membership) return NextResponse.json({ membership: null });

  return NextResponse.json({
    membership: {
      squadId: membership.squadId,
      slug: membership.squad.slug,
      name: membership.squad.name,
      tag: membership.squad.tag,
      role: membership.role,
      joinedAt: membership.joinedAt,
    },
  });
}

/** Join an OPEN squad. */
export async function POST(req: Request) {
  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await joinSquad(user.id, parsed.data.squadId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}

/** Remove a member, or hand over ownership. */
export async function PATCH(req: Request) {
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, targetUserId } = parsed.data;

  const result =
    action === "REMOVE"
      ? await removeMember({ actorId: user.id, targetUserId })
      : await transferOwnership({ ownerId: user.id, newOwnerId: targetUserId });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  if (action === "REMOVE") {
    await audit({
      actorId: user.id,
      action: "SQUAD_MEMBER_REMOVE",
      target: targetUserId,
      req,
    });
  }

  return NextResponse.json({ ok: true });
}

/** Leave the caller's squad. */
export async function DELETE() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await leaveSquad(user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json({ left: true });
}
