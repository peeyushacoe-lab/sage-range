import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditLabClient } from "./_components/edit-lab-client";

export const dynamic = "force-dynamic";

export default async function EditLabPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const lab = await db.lab.findUnique({
    where: { slug },
    include: {
      flags: { orderBy: { id: "asc" } },
      hints: { orderBy: [{ stage: "asc" }, { level: "asc" }] },
    },
  });

  if (!lab) notFound();

  const stages = [...new Set(lab.hints.map(h => h.stage))];

  const hints: Record<string, { level: number; text: string; pointCost: number }[]> = {};
  for (const h of lab.hints) {
    if (!hints[h.stage]) hints[h.stage] = [];
    hints[h.stage].push({ level: h.level, text: h.text, pointCost: h.pointCost });
  }

  return (
    <EditLabClient
      lab={{
        slug:        lab.slug,
        title:       lab.title,
        description: lab.description,
        type:        lab.type,
        difficulty:  lab.difficulty,
        category:    lab.category,
        points:      lab.points,
        published:   lab.published,
      }}
      flags={lab.flags.map(f => ({
        id:            f.id,
        value:         f.value,
        points:        f.points,
        caseSensitive: f.caseSensitive,
      }))}
      stages={stages}
      hints={hints}
    />
  );
}
