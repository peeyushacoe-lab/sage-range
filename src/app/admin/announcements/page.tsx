import { db } from "@/lib/db";
import { AnnouncementForm } from "./_components/announcement-form";
import { AnnouncementRowActions } from "./_components/announcement-row-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements — Admin" };

export default async function AdminAnnouncementsPage() {
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true, email: true } } },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <p className="text-ink-3 text-sm mt-1">Broadcasts shown on every student&apos;s dashboard — published items appear latest-first.</p>
      </div>

      <AnnouncementForm />

      <div className="rounded-xl border border-edge overflow-hidden">
        {announcements.length === 0 ? (
          <p className="text-sm text-ink-3 p-5">No announcements yet — post one above.</p>
        ) : (
          <div className="divide-y divide-edge-subtle">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <p className="text-sm text-ink-2 mt-0.5">{a.body}</p>
                  <p className="text-xs text-ink-3 mt-1.5 font-mono">
                    {a.createdAt.toISOString().slice(0, 10)} · {a.createdBy?.displayName ?? a.createdBy?.email ?? "system"}
                    {a.href && <> · <span className="text-ink-3">{a.href}</span></>}
                  </p>
                </div>
                <AnnouncementRowActions id={a.id} published={a.published} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
