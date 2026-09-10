"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

/**
 * 2D investigation scene, styled as a nighttime scene you're exploring with a
 * flashlight — a deliberate stand-in for the first-person 3D walkthrough this
 * was originally built as (see room-layout.ts's doc comment for why). The
 * flashlight isn't just decoration: outside its radius the room is genuinely
 * dim, so finding something still takes looking around, not just scanning a
 * static grid of icons.
 *
 * Same rule underneath either way: nothing about an object is revealed until
 * you click it, resolved server-side one at a time.
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
  const [revealing, setRevealing] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const roomRef = useRef<HTMLDivElement | null>(null);

  // Flashlight follows the cursor via a CSS custom property, not React state —
  // this needs to update on every mousemove without triggering a re-render.
  useEffect(() => {
    const el = roomRef.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      el!.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el!.style.setProperty("--my", `${e.clientY - rect.top}px`);
    }
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/missions/session/${sessionId}/state`);
      if (!res.ok) return;
      const data: SessionState = await res.json();
      if (cancelled) return;
      setState(data);
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
      setRevealing(key);
      try {
        const [res] = await Promise.all([
          fetch(`/api/missions/session/${sessionId}/evidence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          }),
          // A deliberate beat before the panel appears — long enough to read
          // as "looking closer," short enough not to feel like a load stall.
          new Promise((r) => setTimeout(r, 420)),
        ]);
        if (!res.ok) return;
        const body = await res.json();
        const entry: FoundEntry = { key, label: body.label, description: body.description, kind: body.kind };
        setFoundLog((prev) => ({ ...prev, [key]: entry }));
        setActivePanel(entry);
      } finally {
        setPending(false);
        setRevealing(null);
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
    <div className="flex min-h-screen bg-black text-white">
      {/* Room */}
      <div
        ref={roomRef}
        className="relative flex-1 overflow-hidden bg-[#07080a]"
        style={{ "--mx": "50%", "--my": "50%" } as CSSProperties}
      >
        <RoomIllustration />

        {objects.map((o) => (
          <EvidenceMarker
            key={o.key}
            object={o}
            found={!!foundLog[o.key]}
            revealing={revealing === o.key}
            disabled={pending}
            onClick={() => examine(o.key)}
          />
        ))}

        {/* Darkness layer — everything outside the cursor's radius stays dim,
            so the room has to be explored rather than scanned at a glance.
            A soft base visibility keeps it playable, not pitch black. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle 260px at var(--mx) var(--my), transparent 0%, transparent 35%, rgba(0,0,0,0.78) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle 220px at var(--mx) var(--my), rgba(255,244,214,0.10), transparent 70%)",
          }}
        />

        {/* HUD */}
        <div className="pointer-events-none absolute left-5 top-5 max-w-sm">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{objective}</p>
        </div>
        <div className="pointer-events-none absolute right-5 top-5 text-right text-[10px] uppercase tracking-widest text-zinc-600">
          {Object.keys(foundLog).length}/{objects.length} found
        </div>
        <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-zinc-600">
          Move around, click anything the light catches.
        </p>
      </div>

      {/* Notebook */}
      <div className="w-full max-w-sm overflow-y-auto border-l border-white/10 bg-zinc-950/95 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Investigator notebook</p>
          <button className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setNotebookOpen((v) => !v)}>
            {notebookOpen ? "Collapse" : "Expand"}
          </button>
        </div>
        {notebookOpen &&
          (Object.keys(foundLog).length === 0 ? (
            <p className="text-sm text-zinc-600">Nothing logged yet. Something in the room is worth a closer look.</p>
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
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
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

/** Decorative room — desks, monitors, a window, overhead strip lights. No interaction, just atmosphere. */
function RoomIllustration() {
  return (
    <div className="absolute inset-0">
      {/* Floor */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #111318 0%, #0b0c0f 100%)",
        }}
      />
      <div
        className="absolute inset-8 rounded-xl border border-white/[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Cold moonlight through a window, upper-right */}
      <div
        className="absolute right-[6%] top-[6%] h-40 w-28 rounded-sm border border-blue-400/10"
        style={{ background: "linear-gradient(180deg, rgba(120,160,220,0.08), transparent)" }}
      />

      {/* Desks */}
      <Desk top={32} left={10} width={160} />
      <Desk top={38} left={40} width={120} />
      <Desk top={54} left={60} width={110} />

      {/* Overhead strip lights, mostly off — night shift */}
      <div className="absolute left-[20%] top-[4%] h-1 w-32 rounded-full bg-white/[0.04]" />
      <div className="absolute left-[55%] top-[4%] h-1 w-32 rounded-full bg-white/[0.04]" />

      {/* Restricted-area marking near the badge reader corner */}
      <div className="absolute right-[8%] top-[22%] rotate-[-4deg] text-[9px] uppercase tracking-[0.2em] text-red-500/30">
        Restricted access
      </div>
    </div>
  );
}

function Desk({ top, left, width }: { top: number; left: number; width: number }) {
  return (
    <div
      className="absolute rounded-md border border-amber-900/30 bg-gradient-to-b from-amber-950/25 to-amber-950/10"
      style={{ top: `${top}%`, left: `${left}%`, width, height: width * 0.55 }}
    />
  );
}

const APPEARANCE_ICON: Record<PlacedObject["appearance"], string> = {
  screen: "🖥️",
  small: "🔌",
  note: "📝",
  plant: "🌿",
};

function EvidenceMarker({
  object,
  found,
  revealing,
  disabled,
  onClick,
}: {
  object: PlacedObject;
  found: boolean;
  revealing: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ top: `${object.top}%`, left: `${object.left}%` }}
      className={`group absolute z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-2xl transition-all duration-200 ${
        revealing ? "scale-125 border-amber-400/60 bg-amber-400/10" : ""
      } ${
        found
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-white/[0.03] hover:scale-110 hover:border-white/25 hover:bg-white/10"
      }`}
    >
      <span className={revealing ? "animate-pulse" : ""}>{APPEARANCE_ICON[object.appearance]}</span>
      {found && !revealing && <span className="text-[9px] uppercase tracking-widest text-emerald-400">Logged</span>}
    </button>
  );
}
