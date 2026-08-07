"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import type { PhaseProps } from "./console";
import { SubmitBar } from "./phase-triage";

type Event = { id: string; description: string };
type Data = { events: Event[]; slots: string[]; tactics: string[] };

/**
 * Phase 4 — Attack Reconstruction.
 *
 * Slot-based rather than drag-and-drop. Dragging is nicer to demo and worse to
 * use: it fails on touch, it is unusable by keyboard, and an accidental drop
 * during a timed competition is a real cost. Assigning each time slot from a
 * dropdown is unambiguous and reversible.
 *
 * Ordering is graded on adjacent pairs, so one misplacement does not cascade
 * through the rest of the timeline.
 */
export function PhaseReconstruction({ data, onSubmit, submitting }: PhaseProps<Data>) {
  // slotIndex → eventId
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [tactics, setTactics] = useState<Record<string, string>>({});

  const used = new Set(Object.values(placed).filter(Boolean));
  const byId = new Map(data.events.map((e) => [e.id, e]));

  function place(slot: number, eventId: string) {
    setPlaced((p) => {
      const next = { ...p };
      // An event can only occupy one slot; assigning it elsewhere vacates the
      // slot it was in rather than silently duplicating it.
      for (const [k, v] of Object.entries(next)) {
        if (v === eventId) delete next[Number(k)];
      }
      if (eventId) next[slot] = eventId;
      else delete next[slot];
      return next;
    });
  }

  const placedCount = Object.values(placed).filter(Boolean).length;
  const taggedCount = Object.values(placed).filter((id) => id && tactics[id]).length;

  function submit() {
    const order = data.slots
      .map((_, i) => placed[i])
      .filter((id): id is string => Boolean(id));
    onSubmit({ answer: { order, tactics } });
  }

  const unplaced = data.events.filter((e) => !used.has(e.id));

  return (
    <div>
      <Card className="mb-4 p-5">
        <p className="text-sm text-zinc-300">
          Eleven events, stripped of their timestamps. Place each one against the time it happened
          and label it with the tactic it represents.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          One of these events contributed nothing to the compromise. It still belongs on the
          timeline — failed attacker activity is part of the incident record.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {data.slots.map((slot, i) => {
            const eventId = placed[i];
            const event = eventId ? byId.get(eventId) : null;
            return (
              <Card key={slot} className={event ? "border-white/15" : "border-dashed"}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <span className="w-16 shrink-0 font-mono text-sm font-bold tabular-nums text-zinc-400">
                    {slot}
                  </span>
                  <div className="min-w-0 flex-1">
                    <select
                      value={eventId ?? ""}
                      onChange={(e) => place(i, e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none"
                    >
                      <option value="">— place an event —</option>
                      {data.events.map((ev) => (
                        <option
                          key={ev.id}
                          value={ev.id}
                          disabled={used.has(ev.id) && ev.id !== eventId}
                        >
                          {ev.description.slice(0, 90)}
                          {ev.description.length > 90 ? "…" : ""}
                        </option>
                      ))}
                    </select>

                    {event && (
                      <>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                          {event.description}
                        </p>
                        <select
                          value={tactics[event.id] ?? ""}
                          onChange={(e) =>
                            setTactics((t) => ({ ...t, [event.id]: e.target.value }))
                          }
                          className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-emerald-500/50 focus:outline-none sm:w-64"
                        >
                          <option value="">— tactic —</option>
                          {data.tactics.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-40 lg:self-start">
          <Card className="p-4">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
              Unplaced ({unplaced.length})
            </p>
            <div className="space-y-2">
              {unplaced.map((e) => (
                <p
                  key={e.id}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-zinc-400"
                >
                  {e.description}
                </p>
              ))}
              {unplaced.length === 0 && (
                <Badge tone="emerald">All events placed</Badge>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <SubmitBar
          complete={Math.min(placedCount, taggedCount)}
          total={data.slots.length}
          submitting={submitting}
          onSubmit={submit}
          noun="events placed and labelled"
        />
      </div>
    </div>
  );
}
