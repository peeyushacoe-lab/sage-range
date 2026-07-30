import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-warn-wash text-warn border-warn-edge",
  APPROVED: "bg-ok-wash text-ok border-ok-edge",
  REJECTED: "bg-danger-wash text-danger border-danger-edge",
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
                filterStatus === s ? "bg-surface-3 border-edge-strong text-ink" : "border-edge text-ink-2 hover:border-edge-strong"
              }`}>
              {s} <span className="text-ink-3 ml-1">{countMap[s] ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      {writeups.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface-1 py-16 text-center">
          <p className="text-ink-3 text-sm">No {filterStatus.toLowerCase()} writeups</p>
        </div>
      ) : (
        <div className="space-y-4">
          {writeups.map(w => (
            <div key={w.id} className="rounded-xl border border-edge bg-surface-1 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-edge flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_BADGE[w.status]}`}>
                      {w.status}
                    </span>
                    <span className="text-xs text-ink-3">{relativeTime(w.createdAt)}</span>
                  </div>
                  <p className="font-semibold text-ink">{w.title}</p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    by {w.user.displayName ?? w.user.email} ·{" "}
                    <Link href={`/labs/${w.lab.slug}`} className="hover:text-ink-2 transition">{w.lab.title}</Link>
                  </p>
                </div>
                <Link href={`/writeups/${w.id}`} target="_blank"
                  className="text-xs text-ink-3 hover:text-ink-2 transition shrink-0">
                  Preview ↗
                </Link>
              </div>

              {/* Body preview */}
              <div className="px-5 py-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-ink-2 whitespace-pre-wrap font-mono leading-relaxed">
                  {w.body.slice(0, 600)}{w.body.length > 600 ? "\n…" : ""}
                </pre>
              </div>

              {/* Actions */}
              {filterStatus === "PENDING" && (
                <div className="px-5 py-3 border-t border-edge flex items-center gap-3">
                  <form action={approve}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit"
                      className="px-4 py-1.5 rounded-lg bg-ok text-white text-xs font-bold hover:bg-ok-wash transition">
                      <Icon name="check" size={14} className="inline-block shrink-0" /> Approve
                    </button>
                  </form>
                  <form action={reject} className="flex items-center gap-2 flex-1">
                    <input type="hidden" name="id" value={w.id} />
                    <input name="verdict" placeholder="Rejection reason (optional)"
                      className="flex-1 bg-surface-2 border border-edge rounded px-2 py-1.5 text-xs text-ink-2 placeholder:text-ink-3 focus:outline-none focus:border-danger-edge" />
                    <button type="submit"
                      className="px-4 py-1.5 rounded-lg bg-danger text-white text-xs font-bold hover:bg-danger-wash transition">
                      <Icon name="cross" size={14} className="inline-block shrink-0" /> Reject
                    </button>
                  </form>
                </div>
              )}
              {filterStatus === "APPROVED" && (
                <div className="px-5 py-3 border-t border-edge">
                  <form action={reject} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={w.id} />
                    <input name="verdict" placeholder="Reason for removal (optional)"
                      className="flex-1 bg-surface-2 border border-edge rounded px-2 py-1.5 text-xs text-ink-2 placeholder:text-ink-3 focus:outline-none focus:border-danger-edge" />
                    <button type="submit"
                      className="px-3 py-1.5 rounded-lg border border-danger-edge text-danger text-xs hover:bg-danger-wash transition">
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
