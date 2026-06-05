"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Ann = { id: string; content: string; createdAt: string };

export function AnnouncementClient({
  classroomId,
  initial,
}: {
  classroomId: string;
  initial: Ann[];
}) {
  const [announcements, setAnnouncements] = useState(initial);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/classroom/${classroomId}/announce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const ann = await res.json() as Ann;
      setAnnouncements((p) => [{ ...ann, createdAt: new Date(ann.createdAt).toISOString() }, ...p]);
      setText("");
      startTransition(() => router.refresh());
    }
    setPosting(false);
  }

  async function remove(annId: string) {
    await fetch(`/api/classroom/${classroomId}/announce?annId=${annId}`, { method: "DELETE" });
    setAnnouncements((p) => p.filter((a) => a.id !== annId));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Post an announcement to your class…"
          rows={2}
          className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
        <button
          onClick={post}
          disabled={posting || !text.trim()}
          className="rounded-lg bg-blue-500 px-4 text-sm font-bold text-white hover:bg-blue-400 disabled:opacity-40 transition shrink-0"
        >
          {posting ? "…" : "Post"}
        </button>
      </div>

      {announcements.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">No announcements yet.</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-white/8 bg-zinc-900/40 px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-200 leading-relaxed">{a.content}</p>
                <p className="text-xs text-zinc-600 mt-1">{new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <button onClick={() => remove(a.id)} className="text-zinc-700 hover:text-red-400 transition text-xs shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
