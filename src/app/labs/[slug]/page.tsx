import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getLabContent, TASK_STAGES } from "./_content";
import { FlagForm } from "./_components/flag-form";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-sage-500 border-sage-500/40",
  MEDIUM: "text-amber-400 border-amber-500/40",
  HARD:   "text-orange-400 border-orange-500/40",
  INSANE: "text-red-400 border-red-500/40",
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
  const completedStages = new Set(labResponses.map((r) => r.stage));

  const taskStages = TASK_STAGES[slug] ?? [];
  const completedTaskCount = taskStages.filter((s) => completedStages.has(s)).length;
  const hasTasks = taskStages.length > 0;

  const Content = getLabContent(slug);
  const diffColor = DIFF_COLORS[lab.difficulty] ?? "text-zinc-400 border-white/10";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/labs" backLabel="Labs" />
      {/* Header bar */}
      <div className="border-b border-white/8 px-6 py-3 flex items-center justify-between">
        <Link href="/labs" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5">
          ← All Labs
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-sage-500 uppercase tracking-wider">{lab.type.replace("_", " ")}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">{lab.category}</span>
          <span className="text-zinc-600">·</span>
          <span className={`border px-2 py-0.5 rounded-full font-medium ${diffColor}`}>{lab.difficulty}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{lab.points} pts</span>
          {alreadySolved && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-sage-500 font-semibold">✓ SOLVED</span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Lab title */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{lab.title}</h1>
          <p className="text-zinc-400 mt-2 leading-relaxed">{lab.description}</p>
        </header>

        {/* Task progress bar */}
        {hasTasks && (
          <div className="mb-8 rounded-xl border border-white/8 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Room Progress</p>
              <p className="text-xs text-zinc-400">
                {completedTaskCount} / {taskStages.length} tasks
                {alreadySolved && <span className="ml-2 text-sage-500 font-medium">· Room Complete ✓</span>}
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
                        done ? "bg-sage-500" : current ? "bg-amber-400 animate-pulse" : "bg-zinc-800"
                      }`}
                    />
                    <p className={`text-[10px] mt-1.5 font-medium ${done ? "text-sage-500" : current ? "text-amber-400" : "text-zinc-600"}`}>
                      Task {i + 1}
                      {done && " ✓"}
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
            <p className="text-zinc-500 text-sm italic">
              No challenge content registered for this lab yet.
            </p>
          )}
        </section>

        {/* Flag submission — only for CTF labs without task stages */}
        {!hasTasks && (
          <section className="border-t border-white/8 pt-6">
            <FlagForm labSlug={lab.slug} alreadySolved={alreadySolved} />
          </section>
        )}

        {/* Community writeups — only shown after solving */}
        {alreadySolved && (
          <section className="border-t border-white/8 pt-6 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-300">Community Writeups</p>
              <Link
                href={`/labs/${slug}/writeups`}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition"
              >
                View writeups →
              </Link>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Read how others solved this challenge, or share your own approach.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
