"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { resolveNetworkState, type NetworkNode, type NetworkEvent } from "@/lib/network-map";
import { NetworkMap } from "./network-map";

import { Icon } from "@/components/ui/icon";
import { NoCopy } from "@/components/ui/no-copy";
type Artifact = {
  id: string;
  type: string;
  title: string;
  content: string;
  order: number;
};

type Hint = { id: string; level: number; pointCost: number; text: string };

type Task = {
  id: string;
  order: number;
  title: string;
  prompt: string;
  answerType: "FREE_TEXT" | "RADIO";
  options: string[];
  points: number;
  hints: Hint[];
};

type Company = {
  name: string;
  industry: string;
  description: string;
  employeeCount: number;
  networkNotes: string | null;
};

type Simulation = {
  id: string;
  slug: string;
  codename: string;
  title: string;
  briefing: string;
  difficulty: string;
  estimatedMinutes: number;
  points: number;
  company: Company;
};

const ARTIFACT_LABEL: Record<string, string> = {
  EVENT_LOG: "Event Log",
  SYSMON_LOG: "Sysmon",
  DEFENDER_LOG: "Defender",
  PCAP_SUMMARY: "PCAP Summary",
  EMAIL: "Email",
  MEMORY_DUMP: "Memory Dump",
  REGISTRY: "Registry",
  TIMELINE: "Timeline",
  FILE_LISTING: "File Listing",
};

function HintList({ hints }: { hints: Hint[] }) {
  const [revealed, setRevealed] = useState<number[]>([]);
  if (hints.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {hints.map((h) => {
        const isRevealed = revealed.includes(h.level);
        return (
          <div key={h.id}>
            {isRevealed ? (
              <p className="text-xs font-mono text-warn bg-warn-wash border border-warn-edge rounded px-2 py-1">
                Hint {h.level} (-{h.pointCost} pts): {h.text}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRevealed((r) => [...r, h.level]);
                  fetch("/api/incidents/hint-view", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hintId: h.id }),
                  }).catch(() => null);
                }}
                className="text-xs text-ink-3 hover:text-warn underline underline-offset-2"
              >
                Reveal hint {h.level} (-{h.pointCost} pts)
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  index,
  unlocked,
  completed,
  onComplete,
}: {
  task: Task;
  index: number;
  unlocked: boolean;
  completed: boolean;
  onComplete: () => void;
}) {
  const [freeText, setFreeText] = useState("");
  const [radioChoice, setRadioChoice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const answer = task.answerType === "FREE_TEXT" ? freeText : radioChoice;
    if (!answer) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/incidents/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, answer }),
      });
      const data = await res.json();
      if (data.correct) {
        onComplete();
      } else {
        setError("Incorrect. Re-check the artifacts and try again.");
      }
    } catch {
      setError("Something went wrong submitting your answer. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <NoCopy
      className={`rounded-xl border p-5 transition ${
        completed
          ? "border-ok-edge bg-ok-wash"
          : unlocked
          ? "border-edge bg-surface-1"
          : "border-edge-subtle bg-surface-0/40 opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">
          <span className="text-ink-3 font-mono mr-2">Task {index + 1}</span>
          {task.title}
        </h3>
        <span className="text-xs font-mono text-ink-3">{task.points} pts</span>
      </div>

      {!unlocked && <p className="text-xs text-ink-3">Complete the previous task to unlock.</p>}

      {unlocked && !completed && (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">{task.prompt}</p>
          <form onSubmit={submit} className="space-y-2">
            {task.answerType === "FREE_TEXT" ? (
              <div className="flex gap-2">
                <input
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 rounded-lg bg-surface-0 border border-edge px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-ok-edge"
                />
                <button
                  type="submit"
                  disabled={submitting || !freeText}
                  className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white transition disabled:opacity-40"
                >
                  Submit
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {task.options.map((opt) => (
                  <label key={opt} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={task.id}
                      value={opt}
                      checked={radioChoice === opt}
                      onChange={() => setRadioChoice(opt)}
                      className="accent-emerald-500 mt-0.5"
                    />
                    <span className="text-sm text-ink">{opt}</span>
                  </label>
                ))}
                <button
                  type="submit"
                  disabled={submitting || !radioChoice}
                  className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white transition disabled:opacity-40"
                >
                  Submit
                </button>
              </div>
            )}
            {error && <p className="text-xs text-danger font-mono">{error}</p>}
          </form>
          <HintList hints={task.hints} />
        </div>
      )}

      {completed && <p className="text-sm font-mono text-ok"><Icon name="check" size={14} className="inline-block shrink-0" /> Completed</p>}
    </NoCopy>
  );
}

export function IncidentPlayerClient({
  simulation,
  artifacts,
  tasks,
  completedTaskIds,
  networkNodes,
  networkEvents,
}: {
  simulation: Simulation;
  artifacts: Artifact[];
  tasks: Task[];
  completedTaskIds: string[];
  networkNodes?: NetworkNode[] | null;
  networkEvents?: NetworkEvent[] | null;
}) {
  const [completed, setCompleted] = useState<string[]>(completedTaskIds);
  const [activeArtifact, setActiveArtifact] = useState(artifacts[0]?.id ?? "");

  const done = (id: string) => completed.includes(id);
  const allDone = tasks.length > 0 && tasks.every((t) => done(t.id));
  const doneCount = tasks.filter((t) => done(t.id)).length;

  const active = artifacts.find((a) => a.id === activeArtifact) ?? artifacts[0];

  // The map re-derives live from local `completed` state, so it updates the
  // instant a task is solved — no reload required.
  const maxCompletedOrder = useMemo(() => {
    const completedOrders = tasks.filter((t) => done(t.id)).map((t) => t.order);
    return completedOrders.length > 0 ? Math.max(...completedOrders) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, tasks]);

  const resolvedNodes = useMemo(() => {
    if (!networkNodes || networkNodes.length === 0) return null;
    return resolveNetworkState(networkNodes, networkEvents ?? [], maxCompletedOrder);
  }, [networkNodes, networkEvents, maxCompletedOrder]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-xs uppercase tracking-widest text-ink-3 font-mono">{simulation.codename}</span>
          <span className="text-xs font-bold text-warn font-mono">{simulation.difficulty}</span>
          <span className="text-xs text-ink-3 font-mono">~{simulation.estimatedMinutes} min</span>
          <span className="text-xs font-bold text-ink-2 font-mono">{simulation.points} pts</span>
        </div>
        <h1 className="text-2xl font-bold">{simulation.title}</h1>
        <p className="text-sm text-ink-3 mt-1">{simulation.company.name}</p>
        <p className="text-ink-2 mt-3 max-w-3xl leading-relaxed">{simulation.briefing}</p>

        <div className="mt-4 rounded-lg border border-edge bg-surface-1 p-4 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Company Environment</p>
          <p className="text-sm text-ink-2">{simulation.company.description}</p>
          {simulation.company.networkNotes && (
            <p className="text-xs text-ink-3 mt-2 font-mono">{simulation.company.networkNotes}</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 max-w-xs h-1.5 rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ok transition-all"
              style={{ width: `${tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-ink-3 font-mono">{doneCount}/{tasks.length} tasks</span>
        </div>
      </header>

      {resolvedNodes && (
        <div className="mb-6">
          <NetworkMap nodes={resolvedNodes} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* Artifacts panel */}
        <div className="rounded-xl border border-edge bg-surface-1 overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-edge p-2">
            {artifacts.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveArtifact(a.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeArtifact === a.id || (!activeArtifact && a.id === artifacts[0]?.id)
                    ? "bg-accent-fill text-white"
                    : "text-ink-2 hover:text-white hover:bg-surface-2"
                }`}
              >
                {ARTIFACT_LABEL[a.type] ?? a.type}
              </button>
            ))}
          </div>
          {active && (
            <div className="p-4">
              <p className="text-sm font-semibold text-ink mb-3">{active.title}</p>
              <pre className="font-mono text-xs text-ok whitespace-pre-wrap overflow-x-auto bg-surface-0 border border-edge rounded-lg p-4 max-h-[560px] overflow-y-auto">
                {active.content}
              </pre>
            </div>
          )}
        </div>

        {/* Tasks panel */}
        <div className="space-y-4">
          {tasks.map((t, i) => (
            <TaskCard
              key={t.id}
              task={t}
              index={i}
              unlocked={i === 0 || done(tasks[i - 1].id)}
              completed={done(t.id)}
              onComplete={() => setCompleted((p) => [...p, t.id])}
            />
          ))}

          {allDone && (
            <div className="rounded-xl border border-ok-edge bg-ok-wash p-5">
              <h3 className="font-bold text-ok text-base mb-1">Simulation Complete</h3>
              <p className="text-sm text-ink-2 mb-4">
                You reconstructed the full attack chain for {simulation.codename} and produced containment and
                reporting recommendations — exactly the workflow of a real incident response engagement.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/incidents/${simulation.slug}/evidence-board`}
                  className="rounded-lg bg-accent-fill px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-ok-wash hover:text-white transition"
                >
                  Continue to Evidence Board →
                </Link>
                <Link
                  href={`/incidents/${simulation.slug}/report`}
                  className="rounded-lg border border-edge-strong px-4 py-2.5 text-center text-sm font-medium text-ink hover:border-edge-strong transition"
                >
                  Skip to Report Builder
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
