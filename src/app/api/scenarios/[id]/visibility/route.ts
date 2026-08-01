import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import {
  canEditScenario,
  canSetVisibility,
  type ScenarioVisibility,
} from "@/lib/scenario-sharing";

const Body = z.object({ visibility: z.enum(["PRIVATE", "UNLISTED", "COMMUNITY"]) });

/** Change who can see a scenario. Author or admin only. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const scenario = await db.customScenario.findUnique({ where: { id } });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const acl = {
    createdById: scenario.createdById,
    visibility: scenario.visibility as ScenarioVisibility,
    published: scenario.published,
    takenDownAt: scenario.takenDownAt,
  };
  const viewer = { userId: user.id, isAdmin: user.role === "ADMIN" };

  if (!canEditScenario(acl, viewer)) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // A takedown an author can undo is not a takedown. Only an admin may return
  // removed content to the gallery.
  if (!canSetVisibility(acl, viewer, parsed.data.visibility)) {
    return NextResponse.json(
      { error: "This scenario was removed by a moderator and cannot be republished." },
      { status: 403 },
    );
  }

  const updated = await db.customScenario.update({
    where: { id },
    data: {
      visibility: parsed.data.visibility,
      // Keep the legacy published flag in step with the new model, so any
      // older query still filtering on it agrees with the gallery.
      published: parsed.data.visibility === "COMMUNITY",
    },
    select: { id: true, visibility: true },
  });

  return NextResponse.json(updated);
}
