"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Stage = { label: string; technique?: string; detail: string };

/** How long each stage holds the screen when the chain plays itself. */
const STAGE_MS = 1400;

/**
 * An attack chain that draws itself one stage at a time.
 *
 * A static diagram arrives whole, so the eye reads the end before it reads the
 * beginning and the causality is lost. Revealing stage by stage puts the
 * sequence back — each node lands only after the one that made it possible.
 *
 * Built from DOM and CSS rather than an image, so it stays readable at any
 * width, selectable, and translatable by the browser.
 */
export function ChainDiagram({ content }: { content: Record<string, unknown> }) {
  const title = String(content.title ?? "Attack chain");
  const caption = String(content.caption ?? "");
  const stages = (content.stages as Stage[] | undefined) ?? [];

  const [revealed, setRevealed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reducedMotion.current = true;
      setRevealed(stages.length);
    }
  }, [stages.length]);

  useEffect(() => {
    if (!playing) return;
    if (revealed >= stages.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setRevealed((r) => r + 1), STAGE_MS);
    return () => clearTimeout(timer);
  }, [playing, revealed, stages.length]);

  if (stages.length === 0) return null;

  const complete = revealed >= stages.length;

  function play() {
    if (complete) setRevealed(1);
    setPlaying(true);
  }

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
      <div className="px-5 py-3 border-b border-red-500/15 flex items-center gap-2">
        <Icon name="target" size={14} className="text-red-400 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-red-400">
          Attack chain
        </span>
        <span className="ml-auto text-[10px] text-zinc-500 tabular-nums shrink-0">
          {Math.min(revealed, stages.length)}/{stages.length}
        </span>
      </div>

      <div className="px-5 py-4">
        <h4 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h4>
        {caption && <p className="text-xs text-zinc-500 leading-relaxed mb-5">{caption}</p>}

        <ol className="relative">
          {stages.map((stage, i) => {
            const shown = i < revealed;
            const isLatest = i === revealed - 1 && !complete;

            return (
              <li key={i} className="relative pl-9 pb-5 last:pb-0">
                {/* Connector to the next node */}
                {i < stages.length - 1 && (
                  <span
                    className={`absolute left-[11px] top-6 bottom-0 w-px origin-top transition-transform duration-500 ${
                      i < revealed - 1 ? "scale-y-100 bg-red-500/35" : "scale-y-0 bg-red-500/35"
                    }`}
                  />
                )}

                {/* Node */}
                <span
                  className={`absolute left-0 top-1 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold font-mono transition-all duration-300 ${
                    shown
                      ? "border-red-500/50 bg-red-500/15 text-red-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-700"
                  } ${isLatest ? "ring-2 ring-red-500/25" : ""}`}
                >
                  {i + 1}
                </span>

                <div
                  className={`transition-all duration-300 ${
                    shown ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1"
                  }`}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h5
                      className={`text-sm font-semibold ${shown ? "text-zinc-100" : "text-zinc-600"}`}
                    >
                      {stage.label}
                    </h5>
                    {stage.technique && (
                      <span className="text-[10px] font-mono text-red-400/70 border border-red-500/25 rounded px-1.5 py-0.5">
                        {stage.technique}
                      </span>
                    )}
                  </div>
                  {shown && (
                    <p className="text-xs text-zinc-400 leading-relaxed mt-1">{stage.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-5 py-2.5 border-t border-red-500/15 flex items-center gap-3">
        <button
          onClick={() => (playing ? setPlaying(false) : play())}
          className="text-zinc-400 hover:text-red-400 transition shrink-0"
          aria-label={playing ? "Pause" : complete ? "Replay" : "Play"}
        >
          <Icon name={playing ? "pause" : complete ? "refresh" : "play"} size={14} />
        </button>

        <button
          onClick={() => {
            setPlaying(false);
            setRevealed((r) => Math.min(stages.length, r + 1));
          }}
          disabled={complete}
          className="text-[11px] text-zinc-500 hover:text-zinc-200 disabled:opacity-25 transition"
        >
          Next stage
        </button>

        <button
          onClick={() => {
            setPlaying(false);
            setRevealed(stages.length);
          }}
          disabled={complete}
          className="ml-auto text-[11px] text-zinc-600 hover:text-zinc-300 disabled:opacity-25 transition shrink-0"
        >
          Show all
        </button>
      </div>
    </div>
  );
}
