"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Line = { kind: "cmd" | "out" | "note"; text: string };

/** Milliseconds per character while a command types. */
const CHAR_MS = 26;
/** Pause after a command finishes typing, before its output appears. */
const AFTER_CMD_MS = 360;
/** How long a block of output or a narration line holds the screen. */
const AFTER_OUT_MS = 520;

const SPEEDS = [1, 1.5, 2] as const;

/**
 * A terminal session that replays itself.
 *
 * This exists in place of a screencast. It plays like one — typing, pausing,
 * scrubbing — but every command stays real text: selectable, searchable by the
 * browser, and copyable into the learner's own shell. Correcting a stale
 * command means editing a string rather than re-recording a video.
 */
export function TerminalReplay({ content }: { content: Record<string, unknown> }) {
  const title = String(content.title ?? "Terminal");
  const host = String(content.host ?? "analyst@vault");
  const lines = useMemo(() => (content.lines as Line[] | undefined) ?? [], [content.lines]);

  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [copied, setCopied] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const finished = lineIdx >= lines.length;

  // Anyone who has asked the system not to animate gets the whole transcript at
  // once. A typing effect they cannot turn off is worse than no effect.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLineIdx(lines.length);
      setStarted(true);
    }
  }, [lines.length]);

  useEffect(() => {
    if (!playing || finished) return;

    const current = lines[lineIdx];
    let delay: number;

    if (current.kind === "cmd" && typed < current.text.length) {
      delay = CHAR_MS / speed;
      const timer = setTimeout(() => setTyped((t) => t + 1), delay);
      return () => clearTimeout(timer);
    }

    delay = (current.kind === "cmd" ? AFTER_CMD_MS : AFTER_OUT_MS) / speed;
    const timer = setTimeout(() => {
      setLineIdx((i) => i + 1);
      setTyped(0);
    }, delay);
    return () => clearTimeout(timer);
  }, [playing, finished, lineIdx, typed, speed, lines]);

  useEffect(() => {
    if (playing && finished) setPlaying(false);
  }, [playing, finished]);

  // Follow the output the way a real terminal does.
  useEffect(() => {
    const el = bodyRef.current;
    if (el && playing) el.scrollTop = el.scrollHeight;
  }, [lineIdx, typed, playing]);

  function play() {
    setStarted(true);
    if (finished) {
      setLineIdx(0);
      setTyped(0);
    }
    setPlaying(true);
  }

  function scrubTo(value: number) {
    setPlaying(false);
    setStarted(true);
    setLineIdx(Math.max(0, Math.min(lines.length, value)));
    setTyped(0);
  }

  async function copyCommands() {
    const commands = lines.filter((l) => l.kind === "cmd").map((l) => l.text).join("\n");
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the text is on screen and selectable.
    }
  }

  const visible = lines.slice(0, lineIdx);
  const current = finished ? null : lines[lineIdx];

  return (
    <div className="rounded-xl border border-white/8 bg-[#0b0d10] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/6 bg-zinc-900/60">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-[11px] text-zinc-400 font-mono truncate">{title}</span>
        <button
          onClick={() => void copyCommands()}
          className="ml-auto text-[10px] text-zinc-500 hover:text-emerald-400 transition border border-white/8 rounded px-2 py-0.5 shrink-0"
        >
          {copied ? "Copied" : "Copy commands"}
        </button>
      </div>

      {/* Transcript */}
      <div
        ref={bodyRef}
        className="px-4 py-4 font-mono text-[13px] leading-relaxed max-h-96 overflow-y-auto min-h-[9rem]"
      >
        {!started && (
          <button
            onClick={play}
            className="w-full flex flex-col items-center justify-center gap-2 py-10 text-zinc-500 hover:text-emerald-400 transition"
          >
            <span className="w-11 h-11 rounded-full border border-current flex items-center justify-center">
              <Icon name="play" size={18} />
            </span>
            <span className="text-[11px] font-sans">Replay this session</span>
          </button>
        )}

        {started &&
          visible.map((line, i) => <TerminalLine key={i} line={line} host={host} />)}

        {started && current && (
          <TerminalLine
            line={current.kind === "cmd" ? { ...current, text: current.text.slice(0, typed) } : current}
            host={host}
            cursor={current.kind === "cmd"}
          />
        )}
      </div>

      {/* Controls */}
      {started && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/6 bg-zinc-900/40">
          <button
            onClick={() => (playing ? setPlaying(false) : play())}
            className="text-zinc-400 hover:text-emerald-400 transition shrink-0"
            aria-label={playing ? "Pause" : finished ? "Replay" : "Play"}
          >
            <Icon name={playing ? "pause" : finished ? "refresh" : "play"} size={15} />
          </button>

          <input
            type="range"
            min={0}
            max={lines.length}
            value={lineIdx}
            onChange={(e) => scrubTo(Number(e.target.value))}
            aria-label="Scrub the session"
            className="flex-1 h-1 accent-emerald-500 cursor-pointer"
          />

          <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 w-12 text-right">
            {Math.min(lineIdx, lines.length)}/{lines.length}
          </span>

          <button
            onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
            className="text-[10px] text-zinc-500 hover:text-zinc-200 transition border border-white/8 rounded px-1.5 py-0.5 shrink-0 tabular-nums"
          >
            {speed}×
          </button>

          <button
            onClick={() => scrubTo(lines.length)}
            className="text-[10px] text-zinc-500 hover:text-zinc-200 transition shrink-0"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

function TerminalLine({
  line,
  host,
  cursor = false,
}: {
  line: Line;
  host: string;
  cursor?: boolean;
}) {
  if (line.kind === "note") {
    return (
      <p className="text-[12px] text-sky-400/70 italic my-2 font-sans pl-1 border-l-2 border-sky-500/25 py-0.5">
        {line.text}
      </p>
    );
  }

  if (line.kind === "cmd") {
    return (
      <div className="flex gap-2 mt-3 first:mt-0">
        <span className="text-emerald-500 shrink-0 select-none">{host}$</span>
        <span className="text-zinc-100 whitespace-pre-wrap break-all">
          {line.text}
          {cursor && <span className="inline-block w-2 h-4 bg-emerald-400 align-text-bottom ml-0.5 animate-pulse" />}
        </span>
      </div>
    );
  }

  return (
    <pre className="text-zinc-400 whitespace-pre-wrap break-words mt-1">{line.text}</pre>
  );
}
