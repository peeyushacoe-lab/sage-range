import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { BumpVersionForm } from "./_components/bump-version-form";

export const dynamic = "force-dynamic";

export default async function LabVersionHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const lab = await db.lab.findUnique({
    where: { slug },
    include: {
      changelog: {
        include: { changedBy: { select: { displayName: true, email: true } } },
        orderBy: { version: "desc" },
      },
      _count: { select: { attempts: true } },
    },
  });

  if (!lab) notFound();

  // Count how many students are on outdated versions
  const staleCount = await db.attempt.count({
    where: { labId: lab.id, labVersion: { lt: lab.version }, status: "IN_PROGRESS" },
  });

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/labs" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-4 block">
        ← All Labs
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{lab.title}</h1>
          <p className="text-zinc-500 text-sm mt-1 font-mono">{lab.slug}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">v{lab.version}</p>
          <p className="text-xs text-zinc-600">current version</p>
        </div>
      </div>

      {staleCount > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-amber-400">⚠</span>
          <p className="text-sm text-amber-300">
            <span className="font-semibold">{staleCount} student{staleCount !== 1 ? "s" : ""}</span> currently working on an older version of this lab.
          </p>
        </div>
      )}

      {/* Bump version form */}
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5 mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-1">Publish a New Version</h2>
        <p className="text-xs text-zinc-600 mb-4">
          Bump the version when you make meaningful changes to the lab content. Students will see a notice if their in-progress attempt is on an older version.
        </p>
        <BumpVersionForm slug={slug} currentVersion={lab.version} />
      </div>

      {/* Version history */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Version History</h2>
        {lab.changelog.length === 0 ? (
          <p className="text-zinc-600 text-sm">No version changes recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {lab.changelog.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/6 bg-zinc-900/30 px-4 py-3 flex items-start gap-4">
                <div className="shrink-0 w-12 text-center">
                  <p className="text-sm font-bold text-zinc-300">v{entry.version}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">{entry.summary}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {entry.changedBy.displayName ?? entry.changedBy.email} · {entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-white/5 px-4 py-3 flex items-start gap-4 opacity-40">
              <div className="shrink-0 w-12 text-center">
                <p className="text-sm font-bold text-zinc-600">v1</p>
              </div>
              <p className="text-sm text-zinc-600">Initial release</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
