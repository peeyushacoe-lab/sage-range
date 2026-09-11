"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ENVIRONMENTS, type PlacedObject } from "./room-layout";

type Suspect = { id: string; name: string; role: string };

type SessionState = {
  sessionId: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  scenario: {
    slug: string;
    title: string;
    briefing: string;
    objective: string;
    environment: string;
    suspects: Suspect[];
    classifications: string[];
    caseTitle: string;
    phaseNumber: number;
    phaseLabel: string;
    isFinalPhase: boolean;
  };
  objects: { key: string; kind: string }[];
  found: string[];
  score: number | null;
  scoreBreakdown: Record<string, number> | null;
  nextPhaseSlug: string | null;
};

type FoundEntry = { key: string; label: string; description: string; kind: string };
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * 2D investigation scene, styled as a nighttime scene explored with a
 * flashlight — a deliberate stand-in for the first-person 3D walkthrough
 * this was originally built as (see room-layout.ts's doc comment for why).
 *
 * Two things happen here, not one: finding evidence (click a marker, it
 * resolves server-side, gets logged), and filing a conclusion (who, what,
 * how bad, backed by which evidence) that's actually graded against a
 * hidden answer key. The first without the second is just reading notes —
 * the conclusion is the part that tests whether the reading led anywhere.
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
  const [concluding, setConcluding] = useState(false);

  const roomRef = useRef<HTMLDivElement | null>(null);

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

  if (state.status === "SUBMITTED") {
    return (
      <Debrief
        phaseLabel={state.scenario.phaseLabel}
        isFinalPhase={state.scenario.isFinalPhase}
        score={state.score ?? 0}
        breakdown={state.scoreBreakdown ?? {}}
        onExit={() => router.push("/missionanalyst")}
        onContinue={
          state.nextPhaseSlug
            ? async () => {
                await fetch(`/api/missions/${state.nextPhaseSlug}/start`, { method: "POST" });
                router.push(`/missionanalyst/${state.nextPhaseSlug}/investigate`);
              }
            : undefined
        }
      />
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

        <div className="pointer-events-none absolute left-5 top-5 max-w-sm">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            {state.scenario.caseTitle} · Phase {state.scenario.phaseNumber} — {state.scenario.phaseLabel}
          </p>
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
      <div className="flex w-full max-w-sm flex-col overflow-y-auto border-l border-white/10 bg-zinc-950/95 p-5">
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

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <button
            className="w-full rounded-lg bg-emerald-500/90 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={Object.keys(foundLog).length === 0}
            onClick={() => setConcluding(true)}
          >
            File your findings
          </button>
          <button
            className="w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:bg-white/5"
            onClick={() => router.push("/missionanalyst")}
          >
            Exit to briefing
          </button>
        </div>
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

      {/* Conclusion form */}
      {concluding && (
        <ConclusionForm
          sessionId={sessionId}
          suspects={state.scenario.suspects}
          classifications={state.scenario.classifications}
          foundEntries={Object.values(foundLog)}
          onClose={() => setConcluding(false)}
          onSubmitted={() => {
            // Re-fetch to land on the debrief branch above rather than
            // duplicating the score display here.
            fetch(`/api/missions/session/${sessionId}/state`)
              .then((r) => r.json())
              .then(setState);
          }}
        />
      )}
    </div>
  );
}

function ConclusionForm({
  sessionId,
  suspects,
  classifications,
  foundEntries,
  onClose,
  onSubmitted,
}: {
  sessionId: string;
  suspects: Suspect[];
  classifications: string[];
  foundEntries: FoundEntry[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [suspectId, setSuspectId] = useState("");
  const [classification, setClassification] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [cited, setCited] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = suspectId && classification && severity && summary.trim().length > 0;

  function toggleCited(key: string) {
    setCited((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/missions/session/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suspectId,
        classification,
        severity,
        evidenceKeys: [...cited],
        summary: summary.trim(),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not submit");
      setSubmitting(false);
      return;
    }
    onSubmitted();
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-amber-400">Final step — one shot</p>
        <h3 className="mb-4 text-lg font-bold text-zinc-100">File your findings</h3>

        <Field label="Who was responsible?">
          <div className="space-y-1.5">
            {suspects.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                  suspectId === s.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <input type="radio" name="suspect" className="accent-emerald-500" checked={suspectId === s.id} onChange={() => setSuspectId(s.id)} />
                <span className="font-medium text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.role}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="How do you classify this incident?">
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">Select…</option>
            {classifications.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Severity">
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold uppercase tracking-wide ${
                  severity === s ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/[0.02] text-zinc-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Evidence that supports your conclusion (${cited.size} selected)`}>
          {foundEntries.length === 0 ? (
            <p className="text-xs text-zinc-600">Nothing found yet.</p>
          ) : (
            <div className="space-y-1.5">
              {foundEntries.map((e) => (
                <label
                  key={e.key}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                    cited.has(e.key) ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <input type="checkbox" className="mt-0.5 accent-emerald-500" checked={cited.has(e.key)} onChange={() => toggleCited(e.key)} />
                  <span className="font-medium text-zinc-200">{e.label}</span>
                </label>
              ))}
            </div>
          )}
        </Field>

        <Field label="Executive summary">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="What happened, in a few sentences someone outside this investigation could understand."
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
        </Field>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-zinc-400 hover:bg-white/5" onClick={onClose}>
            Back to investigating
          </button>
          <button
            className="flex-1 rounded-lg bg-emerald-500/90 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!ready || submitting}
            onClick={submit}
          >
            {submitting ? "Submitting…" : "Submit — final"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

function Debrief({
  phaseLabel,
  isFinalPhase,
  score,
  breakdown,
  onExit,
  onContinue,
}: {
  phaseLabel: string;
  isFinalPhase: boolean;
  score: number;
  breakdown: Record<string, number>;
  onExit: () => void;
  onContinue?: () => void | Promise<void>;
}) {
  const [advancing, setAdvancing] = useState(false);
  const rows: [string, number, number][] = [
    ["Responsible party", breakdown.suspect ?? 0, 30],
    ["Classification", breakdown.classification ?? 0, 25],
    ["Severity", breakdown.severity ?? 0, 15],
    ["Supporting evidence", breakdown.evidence ?? 0, 30],
  ];
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-emerald-400">
          {phaseLabel} submitted{isFinalPhase ? " — case complete" : ""}
        </p>
        <p className="mb-5 font-mono text-4xl font-bold tabular-nums">
          {score}
          <span className="text-lg text-zinc-600"> / 100</span>
        </p>
        <div className="space-y-2">
          {rows.map(([label, got, max]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-mono tabular-nums text-zinc-200">
                {got}
                <span className="text-zinc-600">/{max}</span>
              </span>
            </div>
          ))}
        </div>
        {onContinue ? (
          <button
            className="mt-6 w-full rounded-lg bg-emerald-500/90 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            disabled={advancing}
            onClick={async () => {
              setAdvancing(true);
              await onContinue();
            }}
          >
            {advancing ? "Loading next phase…" : "Continue to next phase"}
          </button>
        ) : (
          <button
            className="mt-6 w-full rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            onClick={onExit}
          >
            Back to briefing
          </button>
        )}
      </div>
    </div>
  );
}

/** Decorative room — desks, monitors, a window, overhead strip lights. No interaction, just atmosphere. */
function RoomIllustration() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #111318 0%, #0b0c0f 100%)" }}
      />
      <div
        className="absolute inset-8 rounded-xl border border-white/[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute right-[6%] top-[6%] h-40 w-28 rounded-sm border border-blue-400/10"
        style={{ background: "linear-gradient(180deg, rgba(120,160,220,0.08), transparent)" }}
      />
      <Desk top={32} left={10} width={160} />
      <Desk top={38} left={40} width={120} />
      <Desk top={54} left={60} width={110} />
      <div className="absolute left-[20%] top-[4%] h-1 w-32 rounded-full bg-white/[0.04]" />
      <div className="absolute left-[55%] top-[4%] h-1 w-32 rounded-full bg-white/[0.04]" />
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
