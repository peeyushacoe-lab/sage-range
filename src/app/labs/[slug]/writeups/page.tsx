import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

import { Icon } from "@/components/ui/icon";
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
      <div className="min-h-screen bg-surface-0 text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <p className="flex justify-center"><Icon name="lock" size={48} /></p>
          <h1 className="text-xl font-bold">Solve the lab to unlock writeups</h1>
          <p className="text-sm text-ink-3">Community writeups are only visible after you&apos;ve solved the challenge.</p>
          <Link href={`/labs/${slug}`}
            className="inline-block mt-2 px-4 py-2 rounded-lg bg-ok text-white text-sm font-semibold hover:bg-ok-wash transition">
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
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/labs/${slug}`} className="text-xs text-ink-3 hover:text-ink-2 transition mb-2 inline-block">
              ← Back to lab
            </Link>
            <h1 className="text-2xl font-bold">Community Writeups</h1>
            <p className="text-sm text-ink-3 mt-0.5">{lab.title}</p>
          </div>
          <Link
            href={`/labs/${slug}/writeups/submit`}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-ok-edge text-ok hover:bg-ok-wash transition"
          >
            {myWriteup ? "Edit my writeup" : "+ Submit writeup"}
          </Link>
        </div>

        {/* Submission confirmation */}
        {submitted === "1" && (
          <div className="rounded-xl border border-ok-edge bg-ok-wash px-4 py-3 text-sm text-ok">
            <Icon name="check" size={14} className="inline-block shrink-0" /> Writeup submitted for review. It will appear here once approved.
          </div>
        )}

        {/* My pending/rejected writeup notice */}
        {myWriteup && myWriteup.status !== "APPROVED" && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            myWriteup.status === "PENDING"
              ? "border-warn-edge bg-warn-wash text-warn"
              : "border-danger-edge bg-danger-wash text-danger"
          }`}>
            {myWriteup.status === "PENDING"
              ? "⏳ Your writeup is under review and not yet public."
              : <><Icon name="cross" size={13} className="inline-block" /> {`Your writeup was rejected${myWriteup.verdict ? `: ${myWriteup.verdict}` : ""}. `}</>}
            {myWriteup.status === "REJECTED" && (
              <Link href={`/labs/${slug}/writeups/submit`} className="underline ml-1">Update and resubmit →</Link>
            )}
          </div>
        )}

        {/* Writeup list */}
        {writeups.length === 0 ? (
          <div className="rounded-xl border border-edge bg-surface-1 py-16 text-center">
            <p className="mb-3 flex justify-center"><Icon name="note" size={32} /></p>
            <p className="text-ink-2 text-sm font-medium">No approved writeups yet</p>
            <p className="text-ink-3 text-xs mt-1">Be the first to share your approach!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {writeups.map(w => (
              <Link
                key={w.id}
                href={`/writeups/${w.id}`}
                className="block rounded-xl border border-edge bg-surface-1 hover:bg-surface-1 hover:border-edge-strong transition px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{w.title}</p>
                    <p className="text-xs text-ink-3 mt-1">
                      by {w.user.displayName ?? "Anonymous"} · {relativeTime(w.createdAt)}
                    </p>
                  </div>
                  <span className="text-xs text-ok shrink-0 mt-0.5">Read →</span>
                </div>
                <p className="text-xs text-ink-3 mt-2 line-clamp-2">
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
