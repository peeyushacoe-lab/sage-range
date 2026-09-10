"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ENVIRONMENTS, type PlacedObject } from "./room-layout";

type SessionState = {
  sessionId: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  scenario: { slug: string; title: string; briefing: string; objective: string; environment: string };
  objects: { key: string; kind: string }[];
  found: string[];
};

type FoundEntry = { key: string; label: string; description: string; kind: string };

const APPEARANCE_ICON: Record<PlacedObject["appearance"], string> = {
  screen: "🖥️",
  small: "🔌",
  note: "📝",
  plant: "🌿",
};

/**
 * 2D investigation scene.
 *
 * Same rules as a first-person walk-around would have had: the room shows
 * only opaque object markers, nothing tells you what's interesting in
 * advance, and clicking one is the only way to learn what it actually is —
 * resolved server-side, one object at a time.
 */
export function InvestigationScene({
  sessionId,
  title,
  objective,
  environment,
}: {
  sessionId: string;
  title: string;
  objective: string;
  environment: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<SessionState | null>(null);
  const [foundLog, setFoundLog] = useState<Record<string, FoundEntry>>({});
  const [notebookOpen, setNotebookOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<FoundEntry | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/missions/session/${sessionId}/state`);
      if (!res.ok) return;
      const data: SessionState = await res.json();
      if (cancelled) return;
      setState(data);
      // Re-resolve anything already found in a previous visit — idempotent
      // on the server, and this player already legitimately unlocked it.
      for (const key of data.found) {
        const r = await fetch(`/api/missions/session/${sessionId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!r.ok || cancelled) continue;
        const body = await r.json();
        setFoundLog((prev) => ({ ...prev, [key]: { key, label: body.label, description: body.description, kind: body.kind } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const objects = useMemo<PlacedObject[]>(() => {
    if (!state) return [];
    const layout = ENVIRONMENTS[environment]?.objects ?? [];
    const known = new Set(state.objects.map((o) => o.key));
    return layout.filter((o) => known.has(o.key));
  }, [state, environment]);

  const examine = useCallback(
    async (key: string) => {
      if (pending) return;
      setPending(true);
      try {
        const res = await fetch(`/api/missions/session/${sessionId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!res.ok) return;
        const body = await res.json();
        const entry: FoundEntry = { key, label: body.label, description: body.description, kind: body.kind };
        setFoundLog((prev) => ({ ...prev, [key]: entry }));
        setActivePanel(entry);
      } finally {
        setPending(false);
      }
    },
    [sessionId, pending],
  );

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading scene…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      {/* Room */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, #2a2c33 0%, #17181c 55%, #0c0d10 100%)",
          }}
        >
          {/* Floor grid, purely decorative */}
          <div
            className="absolute inset-8 rounded-xl border border-white/10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Desks, decorative */}
          <div className="absolute left-[10%] top-[32%] h-24 w-40 rounded-md border border-amber-900/40 bg-amber-950/30" />
          <div className="absolute left-[62%] top-[54%] h-20 w-28 rounded-md border border-amber-900/40 bg-amber-950/30" />
          <div className="absolute left-[44%] top-[38%] h-20 w-28 rounded-md border border-amber-900/40 bg-amber-950/30" />

          {objects.map((o) => {
            const done = !!foundLog[o.key];
            return (
              <button
                key={o.key}
                onClick={() => examine(o.key)}
                disabled={pending}
                style={{ top: `${o.top}%`, left: `${o.left}%` }}
                className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-2xl transition ${
                  done
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <span>{APPEARANCE_ICON[o.appearance]}</span>
                {done && <span className="text-[9px] uppercase tracking-widest text-emerald-400">Logged</span>}
              </button>
            );
          })}
        </div>

        {/* HUD */}
        <div className="pointer-events-none absolute left-4 top-4 max-w-sm">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{objective}</p>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 text-right text-[10px] uppercase tracking-widest text-zinc-600">
          {Object.keys(foundLog).length}/{objects.length} found
        </div>
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-zinc-600">
          Click anything in the room to examine it.
        </p>
      </div>

      {/* Notebook — always visible as a side panel in the 2D layout */}
      <div className="w-full max-w-sm overflow-y-auto border-l border-white/10 bg-zinc-950/95 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Investigator notebook</p>
          <button
            className="text-xs text-zinc-500 hover:text-zinc-300"
            onClick={() => setNotebookOpen((v) => !v)}
          >
            {notebookOpen ? "Collapse" : "Expand"}
          </button>
        </div>
        {notebookOpen &&
          (Object.keys(foundLog).length === 0 ? (
            <p className="text-sm text-zinc-600">Nothing logged yet. Click something in the room.</p>
          ) : (
            <ul className="space-y-3">
              {Object.values(foundLog).map((e) => (
                <li key={e.key} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">{e.kind}</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-200">{e.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{e.description}</p>
                </li>
              ))}
            </ul>
          ))}
        <button
          className="mt-6 w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:bg-white/5"
          onClick={() => router.push("/missionanalyst")}
        >
          Exit to briefing
        </button>
      </div>

      {/* Evidence result panel */}
      {activePanel && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-emerald-400">
              {activePanel.kind === "DIGITAL" ? "Digital evidence" : "Physical evidence"}
            </p>
            <h3 className="mb-3 text-lg font-bold text-zinc-100">{activePanel.label}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{activePanel.description}</p>
            <button
              className="mt-5 w-full rounded-lg bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/15"
              onClick={() => setActivePanel(null)}
            >
              Continue investigating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
