import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { listScenarios } from "@/lib/simulation/runtime/scenarios/manifest";

export async function GET(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const term = q.toLowerCase();
  const results: { type: string; id: string; title: string; subtitle: string; href: string }[] = [];

  // Labs
  const labs = await db.lab.findMany({
    where: {
      published: true,
      OR: [
        { title:       { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category:    { contains: q, mode: "insensitive" } },
      ],
    },
    select: { slug: true, title: true, difficulty: true, type: true, category: true },
    take: 6,
  });
  for (const l of labs) {
    results.push({ type: "lab", id: l.slug, title: l.title, subtitle: `${l.type.replace("_", " ")} · ${l.difficulty} · ${l.category}`, href: `/labs/${l.slug}` });
  }

  // Learning paths
  const paths = await db.learningPath.findMany({
    where: {
      published: true,
      OR: [
        { title:       { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { slug: true, title: true, description: true },
    take: 4,
  });
  for (const p of paths) {
    results.push({ type: "path", id: p.slug, title: p.title, subtitle: p.description.slice(0, 80), href: `/paths` });
  }

  // Built-in scenarios (in-memory)
  for (const s of listScenarios()) {
    if (
      s.title.toLowerCase().includes(term) ||
      s.briefing.toLowerCase().includes(term) ||
      s.tags.some((t) => t.includes(term))
    ) {
      results.push({ type: "scenario", id: s.id, title: s.title, subtitle: s.subtitle, href: `/simulation/new` });
    }
    if (results.filter((r) => r.type === "scenario").length >= 4) break;
  }

  // Custom scenarios
  const customScenarios = await db.customScenario.findMany({
    where: {
      published: true,
      OR: [
        { title:    { contains: q, mode: "insensitive" } },
        { subtitle: { contains: q, mode: "insensitive" } },
        { briefing: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, subtitle: true },
    take: 3,
  });
  for (const s of customScenarios) {
    results.push({ type: "scenario", id: s.id, title: s.title, subtitle: s.subtitle, href: `/simulation/new` });
  }

  // Users (public profiles) — email intentionally excluded to prevent PII harvesting
  const users = await db.user.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { university:  { contains: q, mode: "insensitive" } },
        { company:     { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, displayName: true, skillScore: true, role: true },
    take: 4,
  });
  for (const u of users) {
    if (u.id === user.id) continue;
    results.push({
      type: "user",
      id: u.id,
      title: u.displayName ?? "User",
      subtitle: `${u.role} · ${u.skillScore} pts`,
      href: `/profile/${u.id}`,
    });
  }

  // Writeups
  const writeups = await db.writeup.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body:  { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, lab: { select: { title: true } }, user: { select: { displayName: true } } },
    take: 4,
  });
  for (const w of writeups) {
    results.push({
      type: "writeup",
      id: w.id,
      title: w.title,
      subtitle: `${w.lab.title} · by ${w.user.displayName ?? "User"}`,
      href: `/writeups/${w.id}`,
    });
  }

  return NextResponse.json({ results: results.slice(0, 20) });
}
