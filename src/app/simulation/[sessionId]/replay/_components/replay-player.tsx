"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
export type ReplayEvent = {
  id: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  narrative: string | null;
  relativeMs: number;
};

export type StageMarker = {
  stage: string;
  label: string;
  relativeMs: number;
  wasBlocked: boolean;
};

const STAGE_COLOR: Record<string, { dot: string; bg: string; text: string }> = {
  NORMAL:               { dot: "bg-surface-3",   bg: "bg-surface-2/60",     text: "text-ink-2" },
  INITIAL_ACCESS:       { dot: "bg-info",   bg: "bg-info-wash",     text: "text-info" },
  EXECUTION:            { dot: "bg-sev-high", bg: "bg-sev-high-wash",   text: "text-sev-high" },
  PERSISTENCE:          { dot: "bg-yellow-500", bg: "bg-yellow-900/30",   text: "text-yellow-300" },
  PRIVILEGE_ESCALATION: { dot: "bg-warn",  bg: "bg-warn-wash",    text: "text-warn" },
  LATERAL_MOVEMENT:     { dot: "bg-pink-500",   bg: "bg-pink-900/30",     text: "text-pink-300" },
  CREDENTIAL_ACCESS:    { dot: "bg-accent", bg: "bg-accent-wash",   text: "text-accent" },
  DATA_EXFILTRATION:    { dot: "bg-danger",    bg: "bg-danger-wash",      text: "text-danger" },
  RANSOMWARE:           { dot: "bg-danger",    bg: "bg-danger-wash",      text: "text-danger" },
  IMPACT:               { dot: "bg-rose-600",   bg: "bg-rose-950/60",     text: "text-rose-200" },
};

const EVENT_ICON: Record<string, string> = {
  SESSION_STARTED:    "▶",
  STAGE_ADVANCE:      "energy",
  STUDENT_ACTION:     "blueTeam",
  CONSEQUENCE:        "impact",
  PRESSURE_EVENT:     "warning",
  CONTROL_PREVENTION: "check",
  ADVERSARY_MOVE:     "adversary",
};

const SPEEDS = [1, 5, 20, 60] as const;

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ReplayPlayer({
  events,
  stages,
  totalMs,
  outcome,
  score,
}: {
  events: ReplayEvent[];
  stages: StageMarker[];
  totalMs: number;
  outcome: string;
  score: number;
}) {
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(20);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const tick = useCallback((now: number) => {
    if (lastTickRef.current === null) {
      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const dt = now - lastTickRef.current;
    lastTickRef.current = now;

    setPlayheadMs((prev) => {
      const next = prev + dt * speed;
      if (next >= totalMs) {
        setPlaying(false);
        return totalMs;
      }
      return next;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, totalMs]);

  useEffect(() => {
    if (playing) {
      lastTickRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  // Auto-scroll feed to bottom as events appear
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [playheadMs]);

  const visibleEvents = events.filter((e) => e.relativeMs <= playheadMs);
  const pct = totalMs > 0 ? (playheadMs / totalMs) * 100 : 0;

  // Current stage
  const currentStage = [...stages].reverse().find((s) => s.relativeMs <= playheadMs);
  const stageColors = STAGE_COLOR[currentStage?.stage ?? "NORMAL"] ?? STAGE_COLOR.NORMAL;

  function reset() {
    setPlaying(false);
    setPlayheadMs(0);
  }

  return (
    <div className="space-y-4">

      {/* Stage indicator */}
      <div className={`rounded-xl border border-edge px-5 py-3 flex items-center gap-3 transition-all ${stageColors.bg}`}>
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${stageColors.dot} ${playing ? "animate-pulse" : ""}`} />
        <span className={`text-sm font-bold tracking-wide ${stageColors.text}`}>
          {currentStage?.label ?? "Pre-Incident"}
        </span>
        {currentStage?.wasBlocked && (
          <span className="text-[10px] font-bold text-ok border border-ok-edge bg-ok-wash rounded px-1.5">CONTAINED</span>
        )}
        <span className="ml-auto text-xs text-ink-3 tabular-nums">{fmtMs(playheadMs)} / {fmtMs(totalMs)}</span>
      </div>

      {/* Progress / scrubber */}
      <div className="rounded-xl border border-edge bg-surface-1 p-4 space-y-3">
        {/* Stage markers on track */}
        <div className="relative h-2 rounded-full bg-surface-2">
          {stages.map((s) => {
            const markerPct = totalMs > 0 ? (s.relativeMs / totalMs) * 100 : 0;
            const c = STAGE_COLOR[s.stage] ?? STAGE_COLOR.NORMAL;
            return (
              <div
                key={s.stage + s.relativeMs}
                title={s.label}
                className={`absolute top-1/2 -translate-y-1/2 h-3 w-1 rounded-sm ${c.dot} opacity-70`}
                style={{ left: `${markerPct}%` }}
              />
            );
          })}
          {/* Playhead fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-ok-wash transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Scrubber input */}
        <input
          type="range"
          min={0}
          max={totalMs}
          step={100}
          value={playheadMs}
          onChange={(e) => { setPlaying(false); setPlayheadMs(Number(e.target.value)); }}
          className="w-full accent-emerald-500 cursor-pointer"
        />

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-4 py-1.5 rounded-lg bg-accent-fill text-white text-xs font-bold hover:bg-accent-hover transition min-w-[64px]"
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-2 hover:text-ink hover:border-edge-strong transition"
          >
            ↺ Reset
          </button>

          {/* Speed */}
          <div className="flex items-center gap-1 ml-auto">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                  speed === s
                    ? "bg-surface-3 text-ink"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event feed */}
      <div
        ref={feedRef}
        className="rounded-xl border border-edge bg-surface-1 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-ink-3">Event Log</p>
          <span className="text-xs text-ink-3">{visibleEvents.length} / {events.length} events</span>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-edge-subtle">
          {visibleEvents.length === 0 && (
            <p className="px-4 py-6 text-xs text-ink-3 text-center">Press play to begin the replay</p>
          )}
          {visibleEvents.map((ev, i) => {
            const icon = EVENT_ICON[ev.type] ?? "·";
            const isAction = ev.type === "STUDENT_ACTION";
            const isStage  = ev.type === "STAGE_ADVANCE";
            return (
              <div
                key={ev.id}
                className={`px-4 py-2.5 flex gap-3 items-start text-xs transition-all
                  ${i === visibleEvents.length - 1 ? "bg-surface-2" : ""}
                  ${isStage ? "bg-sev-high-wash" : ""}
                  ${isAction ? "bg-ok-wash" : ""}
                `}
              >
                <span className="text-ink-3 tabular-nums shrink-0 w-10">{fmtMs(ev.relativeMs)}</span>
                <span className="shrink-0 w-4 text-center">{icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium truncate ${isAction ? "text-ok" : isStage ? "text-sev-high" : "text-ink-2"}`}>
                    {ev.type.replace(/_/g, " ")}
                    {isAction && typeof ev.payload.label === "string" && (
                      <span className="text-ink-2 font-normal"> — {ev.payload.label}</span>
                    )}
                    {isStage && typeof ev.payload.to === "string" && (
                      <span className="text-ink-2 font-normal"> → {ev.payload.to.replace(/_/g, " ")}</span>
                    )}
                  </p>
                  {ev.narrative && (
                    <p className="text-ink-3 text-[11px] mt-0.5 line-clamp-2">{ev.narrative}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcome (shown when playback reaches end) */}
      {playheadMs >= totalMs && totalMs > 0 && (
        <div className={`rounded-xl border p-5 text-center transition-all ${
          outcome === "CONTAINED"
            ? "border-ok-edge bg-ok-wash"
            : "border-danger-edge bg-danger-wash"
        }`}>
          <p className={`text-xl font-black ${outcome === "CONTAINED" ? "text-ok" : "text-danger"}`}>
            {outcome === "CONTAINED" ? <><Icon name="blueTeam" size={16} /> Threat Contained</> : <><Icon name="impact" size={16} /> Breach Occurred</>}
          </p>
          <p className="text-sm text-ink-2 mt-1">Final score: <span className="font-bold text-ink">{score}</span></p>
        </div>
      )}
    </div>
  );
}
