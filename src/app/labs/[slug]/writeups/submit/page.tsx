import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

export default async function SubmitWriteupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const lab = await db.lab.findUnique({ where: { slug } });
  if (!lab || !lab.published) notFound();

  const [attempt, existing] = await Promise.all([
    db.attempt.findUnique({ where: { userId_labId: { userId: user.id, labId: lab.id } } }),
    db.writeup.findUnique({ where: { userId_labId: { userId: user.id, labId: lab.id } } }),
  ]);

  if (attempt?.status !== "SOLVED") redirect(`/labs/${slug}`);

  async function submit(form: FormData) {
    "use server";
    const me = await getOrCreateAppUser();
    if (!me) return;

    const title = (form.get("title") as string | null)?.trim() ?? "";
    const body  = (form.get("body")  as string | null)?.trim() ?? "";
    if (!title || body.length < 100) return;

    const theLab = await db.lab.findUnique({ where: { slug } });
    if (!theLab) return;

    const solved = await db.attempt.findUnique({
      where: { userId_labId: { userId: me.id, labId: theLab.id } },
    });
    if (solved?.status !== "SOLVED") return;

    await db.writeup.upsert({
      where:  { userId_labId: { userId: me.id, labId: theLab.id } },
      create: { userId: me.id, labId: theLab.id, title, body, status: "PENDING" },
      update: { title, body, status: "PENDING", verdict: null },
    });

    redirect(`/labs/${slug}/writeups?submitted=1`);
  }

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href={`/labs/${slug}/writeups`} className="text-xs text-ink-3 hover:text-ink-2 transition mb-2 inline-block">
            ← Back to writeups
          </Link>
          <h1 className="text-2xl font-bold">Submit Writeup</h1>
          <p className="text-sm text-ink-3 mt-1">{lab.title}</p>
        </div>

        {existing && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            existing.status === "APPROVED" ? "border-ok-edge bg-ok-wash text-ok"
            : existing.status === "REJECTED" ? "border-danger-edge bg-danger-wash text-danger"
            : "border-warn-edge bg-warn-wash text-warn"
          }`}>
            {existing.status === "APPROVED" && <><Icon name="check" size={13} className="inline-block" /> Your writeup is approved and visible to others.</>}
            {existing.status === "PENDING"  && "⏳ Your writeup is under review. You can update and resubmit below."}
            {existing.status === "REJECTED" && (
              <>Rejected{existing.verdict ? `: ${existing.verdict}` : ""}. Update and resubmit below.</>
            )}
          </div>
        )}

        <div className="rounded-xl border border-edge bg-surface-1 p-6 space-y-4">
          <div className="text-xs text-ink-3 space-y-1">
            <p>• Writeups are reviewed before becoming public</p>
            <p>• No flags, answers, or exploit payloads — explain your <em>approach</em></p>
            <p>• Minimum 100 characters. Use ## for section headings</p>
          </div>
          <form action={submit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-ink-3 mb-1.5 block">Title</label>
              <input
                name="title"
                required
                defaultValue={existing?.title ?? ""}
                placeholder="How I solved this challenge…"
                maxLength={120}
                className="w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-ink-3 mb-1.5 block">Writeup</label>
              <textarea
                name="body"
                required
                minLength={100}
                defaultValue={existing?.body ?? ""}
                rows={18}
                placeholder={"## My Approach\n\nDescribe your methodology here…\n\n## Key Insight\n\nWhat made this click?"}
                className="w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge font-mono resize-y"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-ok text-white text-sm font-bold hover:bg-ok-wash transition"
            >
              {existing ? "Resubmit for Review" : "Submit for Review"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
