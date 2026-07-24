import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const ArtifactBody = z.object({
  type:   z.enum(["EVENT_LOG", "SYSMON_LOG", "DEFENDER_LOG", "PCAP_SUMMARY", "EMAIL", "MEMORY_DUMP", "REGISTRY", "TIMELINE", "FILE_LISTING"]),
  title:  z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  order:  z.number().int().min(1).max(100),
  tactic: z.enum(["INITIAL_ACCESS", "PERSISTENCE", "PRIVILEGE_ESCALATION", "LATERAL_MOVEMENT", "COMMAND_AND_CONTROL", "EXFILTRATION", "IMPACT"]).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = ArtifactBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const artifact = await db.incidentSimArtifact.create({
    data: { simulationId: sim.id, ...parsed.data },
  });
  return NextResponse.json({ id: artifact.id });
}

const PatchBody = ArtifactBody.partial().extend({ artifactId: z.string().min(1) });

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { artifactId, ...data } = parsed.data;
  await db.incidentSimArtifact.updateMany({ where: { id: artifactId, simulationId: sim.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const artifactId = new URL(req.url).searchParams.get("artifactId");
  if (!artifactId) return NextResponse.json({ error: "artifactId required" }, { status: 400 });

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.incidentSimArtifact.deleteMany({ where: { id: artifactId, simulationId: sim.id } });
  return NextResponse.json({ ok: true });
}
