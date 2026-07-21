import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default async function LabWriteupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { slug } = await params;
  const { submitted } = await searchParams;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const lab = await db.lab.findUnique({ where: { slug } });
  if (!lab || !lab.published) notFound();

  const attempt = await db.attempt.findUnique({
    where: { userId_labId: { userId: user.id, labId: lab.id } },
  });
  const hasSolved = attempt?.status === "SOLVED";

  if (!hasSolved) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <p className="text-5xl">🔒</p>
          <h1 className="text-xl font-bold">Solve the lab to unlock writeups</h1>
          <p className="text-sm text-zinc-500">Community writeups are only visible after you&apos;ve solved the challenge.</p>
          <Link href={`/labs/${slug}`}
            className="inline-block mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition">
            Back to Lab
          </Link>
        </main>
      </div>
    );
  }

  const [writeups, myWriteup] = await Promise.all([
    db.writeup.findMany({
      where:   { labId: lab.id, status: "APPROVED" },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.writeup.findUnique({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/labs/${slug}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition mb-2 inline-block">
              ← Back to lab
            </Link>
            <h1 className="text-2xl font-bold">Community Writeups</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{lab.title}</p>
          </div>
          <Link
            href={`/labs/${slug}/writeups/submit`}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition"
          >
            {myWriteup ? "Edit my writeup" : "+ Submit writeup"}
          </Link>
        </div>

        {/* Submission confirmation */}
        {submitted === "1" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-400">
            ✓ Writeup submitted for review. It will appear here once approved.
          </div>
        )}

        {/* My pending/rejected writeup notice */}
        {myWriteup && myWriteup.status !== "APPROVED" && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            myWriteup.status === "PENDING"
              ? "border-amber-500/30 bg-amber-500/8 text-amber-400"
              : "border-red-500/30 bg-red-500/8 text-red-400"
          }`}>
            {myWriteup.status === "PENDING"
              ? "⏳ Your writeup is under review and not yet public."
              : `✗ Your writeup was rejected${myWriteup.verdict ? `: ${myWriteup.verdict}` : ""}. `}
            {myWriteup.status === "REJECTED" && (
              <Link href={`/labs/${slug}/writeups/submit`} className="underline ml-1">Update and resubmit →</Link>
            )}
          </div>
        )}

        {/* Writeup list */}
        {writeups.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 py-16 text-center">
            <p className="text-3xl mb-3">✍️</p>
            <p className="text-zinc-400 text-sm font-medium">No approved writeups yet</p>
            <p className="text-zinc-600 text-xs mt-1">Be the first to share your approach!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {writeups.map(w => (
              <Link
                key={w.id}
                href={`/writeups/${w.id}`}
                className="block rounded-xl border border-white/8 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-white/15 transition px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100 truncate">{w.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      by {w.user.displayName ?? "Anonymous"} · {relativeTime(w.createdAt)}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-400 shrink-0 mt-0.5">Read →</span>
                </div>
                <p className="text-xs text-zinc-600 mt-2 line-clamp-2">
                  {w.body.slice(0, 180).replace(/#+\s/g, "").trim()}…
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
