import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default async function AdminWriteupsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const { status } = await searchParams;
  const filterStatus = (["PENDING", "APPROVED", "REJECTED"].includes(status ?? "") ? status : "PENDING") as
    "PENDING" | "APPROVED" | "REJECTED";

  const writeups = await db.writeup.findMany({
    where:   { status: filterStatus },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
      lab:  { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const counts = await db.writeup.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count.id]));

  async function approve(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.writeup.update({ where: { id }, data: { status: "APPROVED", verdict: null } });
    redirect("/admin/writeups?status=PENDING");
  }

  async function reject(formData: FormData) {
    "use server";
    const id      = formData.get("id")      as string;
    const verdict = (formData.get("verdict") as string | null)?.trim() ?? null;
    await db.writeup.update({ where: { id }, data: { status: "REJECTED", verdict } });
    redirect("/admin/writeups?status=PENDING");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Writeup Moderation</h1>
        <div className="flex gap-2">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map(s => (
            <Link key={s} href={`/admin/writeups?status=${s}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                filterStatus === s ? "bg-zinc-700 border-white/20 text-zinc-100" : "border-white/8 text-zinc-400 hover:border-white/20"
              }`}>
              {s} <span className="text-zinc-600 ml-1">{countMap[s] ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      {writeups.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 py-16 text-center">
          <p className="text-zinc-500 text-sm">No {filterStatus.toLowerCase()} writeups</p>
        </div>
      ) : (
        <div className="space-y-4">
          {writeups.map(w => (
            <div key={w.id} className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/8 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_BADGE[w.status]}`}>
                      {w.status}
                    </span>
                    <span className="text-xs text-zinc-600">{relativeTime(w.createdAt)}</span>
                  </div>
                  <p className="font-semibold text-zinc-100">{w.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    by {w.user.displayName ?? w.user.email} ·{" "}
                    <Link href={`/labs/${w.lab.slug}`} className="hover:text-zinc-300 transition">{w.lab.title}</Link>
                  </p>
                </div>
                <Link href={`/writeups/${w.id}`} target="_blank"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition shrink-0">
                  Preview ↗
                </Link>
              </div>

              {/* Body preview */}
              <div className="px-5 py-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                  {w.body.slice(0, 600)}{w.body.length > 600 ? "\n…" : ""}
                </pre>
              </div>

              {/* Actions */}
              {filterStatus === "PENDING" && (
                <div className="px-5 py-3 border-t border-white/8 flex items-center gap-3">
                  <form action={approve}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition">
                      ✓ Approve
                    </button>
                  </form>
                  <form action={reject} className="flex items-center gap-2 flex-1">
                    <input type="hidden" name="id" value={w.id} />
                    <input name="verdict" placeholder="Rejection reason (optional)"
                      className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/40" />
                    <button type="submit"
                      className="px-4 py-1.5 rounded-lg bg-red-700 text-white text-xs font-bold hover:bg-red-600 transition">
                      ✗ Reject
                    </button>
                  </form>
                </div>
              )}
              {filterStatus === "APPROVED" && (
                <div className="px-5 py-3 border-t border-white/8">
                  <form action={reject} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={w.id} />
                    <input name="verdict" placeholder="Reason for removal (optional)"
                      className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/40" />
                    <button type="submit"
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition">
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
