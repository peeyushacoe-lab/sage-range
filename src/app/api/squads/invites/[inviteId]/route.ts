import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { acceptInvite, declineInvite } from "@/lib/squads";

const Body = z.object({ action: z.enum(["ACCEPT", "DECLINE"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteId } = await params;

  const result =
    parsed.data.action === "ACCEPT"
      ? await acceptInvite(user.id, inviteId)
      : await declineInvite(user.id, inviteId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json({ action: parsed.data.action, ...result.data });
}
