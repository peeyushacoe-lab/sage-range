import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

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
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href={`/labs/${slug}/writeups`} className="text-xs text-zinc-500 hover:text-zinc-300 transition mb-2 inline-block">
            ← Back to writeups
          </Link>
          <h1 className="text-2xl font-bold">Submit Writeup</h1>
          <p className="text-sm text-zinc-500 mt-1">{lab.title}</p>
        </div>

        {existing && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            existing.status === "APPROVED" ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
            : existing.status === "REJECTED" ? "border-red-500/30 bg-red-500/8 text-red-400"
            : "border-amber-500/30 bg-amber-500/8 text-amber-400"
          }`}>
            {existing.status === "APPROVED" && "✓ Your writeup is approved and visible to others."}
            {existing.status === "PENDING"  && "⏳ Your writeup is under review. You can update and resubmit below."}
            {existing.status === "REJECTED" && (
              <>Rejected{existing.verdict ? `: ${existing.verdict}` : ""}. Update and resubmit below.</>
            )}
          </div>
        )}

        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-6 space-y-4">
          <div className="text-xs text-zinc-600 space-y-1">
            <p>• Writeups are reviewed before becoming public</p>
            <p>• No flags, answers, or exploit payloads — explain your <em>approach</em></p>
            <p>• Minimum 100 characters. Use ## for section headings</p>
          </div>
          <form action={submit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5 block">Title</label>
              <input
                name="title"
                required
                defaultValue={existing?.title ?? ""}
                placeholder="How I solved this challenge…"
                maxLength={120}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5 block">Writeup</label>
              <textarea
                name="body"
                required
                minLength={100}
                defaultValue={existing?.body ?? ""}
                rows={18}
                placeholder={"## My Approach\n\nDescribe your methodology here…\n\n## Key Insight\n\nWhat made this click?"}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono resize-y"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition"
            >
              {existing ? "Resubmit for Review" : "Submit for Review"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
