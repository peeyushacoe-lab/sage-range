import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function authorize(id: string) {
  const user = await getOrCreateAppUser();
  if (!user) return { user: null, scenario: null, err: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const scenario = await db.customScenario.findUnique({ where: { id } });
  if (!scenario) return { user, scenario: null, err: NextResponse.json({ error: "not_found" }, { status: 404 }) };

  const canEdit = user.role === "ADMIN" || scenario.createdById === user.id;
  if (!canEdit) return { user, scenario: null, err: NextResponse.json({ error: "forbidden" }, { status: 403 }) };

  return { user, scenario, err: null };
}

const PatchBody = z.object({
  title:              z.string().min(3).max(120).optional(),
  subtitle:           z.string().min(3).max(200).optional(),
  briefing:           z.string().min(20).optional(),
  difficulty:         z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]).optional(),
  estimatedMinutes:   z.number().int().min(5).max(240).optional(),
  personaId:          z.enum(["ransomware_gang", "nation_state_apt", "insider", "hacktivist", "cybercriminal"]).optional(),
  archetypeId:        z.enum(["FINANCIAL_SERVICES", "HEALTHCARE", "STARTUP", "GOVERNMENT", "RETAIL", "TECHNOLOGY"]).optional(),
  templateSlug:       z.enum(["phishing-to-ransomware", "insider-threat", "cloud-misconfiguration", "supply-chain-attack", "data-breach"]).optional(),
  learningObjectives: z.array(z.string().min(5)).min(1).max(8).optional(),
  tags:               z.array(z.string().min(1)).max(12).optional(),
  realWorldAnalogue:  z.string().max(200).nullable().optional(),
  published:          z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scenario, err } = await authorize(id);
  if (err) return err;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const updated = await db.customScenario.update({
    where: { id: scenario!.id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, published: updated.published });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scenario, err } = await authorize(id);
  if (err) return err;

  await db.customScenario.delete({ where: { id: scenario!.id } });
  return NextResponse.json({ ok: true });
}
