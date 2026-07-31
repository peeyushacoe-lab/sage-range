import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { canCloneScenario, cloneTitle, type ScenarioVisibility } from "@/lib/scenario-sharing";

/** Fork a scenario into a private draft owned by the caller. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Cloning writes a row per call, so it needs a ceiling.
  const rl = await rateLimit(`scenario-clone:${user.id}`, { max: 30, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many clones. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { id } = await params;
  const source = await db.customScenario.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const allowed = canCloneScenario(
    {
      createdById: source.createdById,
      visibility: source.visibility as ScenarioVisibility,
      published: source.published,
    },
    { userId: user.id, isAdmin: user.role === "ADMIN" },
  );
  // Absent rather than forbidden: a private draft's existence is not disclosed.
  if (!allowed) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const clone = await db.customScenario.create({
    data: {
      title: cloneTitle(source.title),
      subtitle: source.subtitle,
      briefing: source.briefing,
      difficulty: source.difficulty,
      estimatedMinutes: source.estimatedMinutes,
      personaId: source.personaId,
      archetypeId: source.archetypeId,
      templateSlug: source.templateSlug,
      learningObjectives: source.learningObjectives,
      tags: source.tags,
      realWorldAnalogue: source.realWorldAnalogue,
      createdById: user.id,
      clonedFromId: source.id,
      // A clone always starts private. Inheriting COMMUNITY would republish
      // another author's work under a new name with no review step.
      visibility: "PRIVATE",
      published: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: clone.id }, { status: 201 });
}
