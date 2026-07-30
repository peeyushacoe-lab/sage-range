import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { audit } from "@/lib/audit";
import { getSquadBySlug, disbandSquad } from "@/lib/squads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const squad = await getSquadBySlug(slug);

  if (!squad || squad.disbandedAt) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: squad.id,
    slug: squad.slug,
    name: squad.name,
    tag: squad.tag,
    description: squad.description,
    joinPolicy: squad.joinPolicy,
    maxMembers: squad.maxMembers,
    memberCount: squad._count.members,
    createdAt: squad.createdAt,
    members: squad.members.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName || m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
}

/** Disband. Owner only; soft-deletes so history survives. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const squad = await getSquadBySlug(slug);
  if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  const result = await disbandSquad(user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  await audit({ actorId: user.id, action: "SQUAD_DISBAND", target: squad.id, req });
  return NextResponse.json({ disbanded: true });
}
