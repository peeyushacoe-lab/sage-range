import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { listScenarios } from "@/lib/simulation/runtime/scenarios/manifest";

async function requireInstructor() {
  const user = await getOrCreateAppUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "INSTRUCTOR")) return null;
  return user;
}

// GET — TypeScript built-in scenarios + custom DB scenarios
// ?published=true  → only published custom ones (student view)
// ?mine=true       → only the caller's own custom ones (instructor management)
export async function GET(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("published") === "true";
  const mineOnly = searchParams.get("mine") === "true";
  const isPrivileged = user.role === "ADMIN" || user.role === "INSTRUCTOR";

  let where: Record<string, unknown> = { published: true };
  if (isPrivileged && mineOnly) where = { createdById: user.id };
  else if (isPrivileged && !publishedOnly) where = user.role === "ADMIN" ? {} : { createdById: user.id };

  const custom = await db.customScenario.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, subtitle: true, briefing: true,
      difficulty: true, estimatedMinutes: true, personaId: true,
      archetypeId: true, templateSlug: true, learningObjectives: true,
      tags: true, realWorldAnalogue: true, published: true, createdAt: true,
      createdBy: { select: { displayName: true, email: true } },
    },
  });

  return NextResponse.json({ builtin: listScenarios(), custom });
}

const CreateBody = z.object({
  title:              z.string().min(3).max(120),
  subtitle:           z.string().min(3).max(200),
  briefing:           z.string().min(20),
  difficulty:         z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]),
  estimatedMinutes:   z.number().int().min(5).max(240),
  personaId:          z.enum(["ransomware_gang", "nation_state_apt", "insider", "hacktivist", "cybercriminal"]),
  archetypeId:        z.enum(["FINANCIAL_SERVICES", "HEALTHCARE", "STARTUP", "GOVERNMENT", "RETAIL", "TECHNOLOGY"]),
  templateSlug:       z.enum(["phishing-to-ransomware", "insider-threat", "cloud-misconfiguration", "supply-chain-attack", "data-breach"]),
  learningObjectives: z.array(z.string().min(5)).min(1).max(8),
  tags:               z.array(z.string().min(1)).max(12),
  realWorldAnalogue:  z.string().max(200).optional(),
  published:          z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await requireInstructor();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const scenario = await db.customScenario.create({
    data: { ...parsed.data, createdById: user.id, published: parsed.data.published ?? false },
  });

  return NextResponse.json({ ok: true, id: scenario.id }, { status: 201 });
}
