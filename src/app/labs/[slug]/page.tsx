import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getLabContent, TASK_STAGES } from "./_content";
import { FlagForm } from "./_components/flag-form";
import { Navbar } from "@/components/navbar";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-ok border-ok-edge",
  MEDIUM: "text-warn border-warn-edge",
  HARD:   "text-sev-high border-sev-high-edge",
  INSANE: "text-danger border-danger-edge",
};

export default async function LabDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const lab = await db.lab.findUnique({ where: { slug } });
  if (!lab || !lab.published) notFound();

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [attempt, labResponses] = await Promise.all([
    db.attempt.findUnique({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
    }),
    db.labResponse.findMany({
      where: { userId: user.id, labId: lab.id },
      select: { stage: true },
    }),
  ]);

  const alreadySolved = attempt?.status === "SOLVED";
  const labUpdated = attempt && !alreadySolved && attempt.labVersion < lab.version;
  const completedStages = new Set(labResponses.map((r) => r.stage));

  const taskStages = TASK_STAGES[slug] ?? [];
  const completedTaskCount = taskStages.filter((s) => completedStages.has(s)).length;
  const hasTasks = taskStages.length > 0;

  const Content = getLabContent(slug);
  const diffColor = DIFF_COLORS[lab.difficulty] ?? "text-ink-2 border-edge";

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar backHref="/labs" backLabel="Labs" />
      {labUpdated && (
        <div className="bg-warn-wash border-b border-warn-edge px-6 py-2.5 flex items-center gap-2">
          <span className="text-warn text-sm"><Icon name="warning" size={14} className="inline-block shrink-0" /></span>
          <p className="text-xs text-warn">
            This lab has been updated (v{lab.version}) since you started (v{attempt!.labVersion}). Review the instructions for any changes.
          </p>
        </div>
      )}
      {/* Header bar */}
      <div className="border-b border-edge px-6 py-3 flex items-center justify-between">
        <Link href="/labs" className="text-xs text-ink-3 hover:text-ink-2 flex items-center gap-1.5">
          ← All Labs
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-ink-3 uppercase tracking-wider">{lab.type.replace("_", " ")}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">{lab.category}</span>
          <span className="text-ink-3">·</span>
          <span className={`border px-2 py-0.5 rounded-full font-medium ${diffColor}`}>{lab.difficulty}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-2">{lab.points} pts</span>
          {alreadySolved && (
            <>
              <span className="text-ink-3">·</span>
              <span className="text-ok font-semibold"><Icon name="check" size={14} className="inline-block shrink-0" /> SOLVED</span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Lab title */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{lab.title}</h1>
          <p className="text-ink-2 mt-2 leading-relaxed">{lab.description}</p>
        </header>

        {/* Task progress bar */}
        {hasTasks && (
          <div className="mb-8 rounded-xl border border-edge bg-surface-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-ink-3">Room Progress</p>
              <p className="text-xs text-ink-2">
                {completedTaskCount} / {taskStages.length} tasks
                {alreadySolved && <span className="ml-2 text-ok font-medium">· Room Complete <Icon name="check" size={14} className="inline-block shrink-0" /></span>}
              </p>
            </div>
            <div className="flex gap-2">
              {taskStages.map((stage, i) => {
                const done = completedStages.has(stage);
                const current = !done && completedTaskCount === i;
                return (
                  <div key={stage} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        done ? "bg-ok" : current ? "bg-warn animate-pulse" : "bg-surface-2"
                      }`}
                    />
                    <p className={`text-[10px] mt-1.5 font-medium ${done ? "text-ok" : current ? "text-warn" : "text-ink-3"}`}>
                      Task {i + 1}
                      {done && <Icon name="check" size={12} className="inline-block ml-1" />}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lab content */}
        <section className="mb-10">
          {Content ? (
            await Content({ labId: lab.id, userId: user.id })
          ) : (
            <p className="text-ink-3 text-sm italic">
              No challenge content registered for this lab yet.
            </p>
          )}
        </section>

        {/* Flag submission — only for CTF labs without task stages */}
        {!hasTasks && (
          <section className="border-t border-edge pt-6">
            <FlagForm labSlug={lab.slug} alreadySolved={alreadySolved} />
          </section>
        )}

        {/* Community writeups — only shown after solving */}
        {alreadySolved && (
          <section className="border-t border-edge pt-6 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-2">Community Writeups</p>
              <Link
                href={`/labs/${slug}/writeups`}
                className="text-xs text-ok hover:text-ok transition"
              >
                View writeups →
              </Link>
            </div>
            <p className="text-xs text-ink-3 mt-1">
              Read how others solved this challenge, or share your own approach.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
