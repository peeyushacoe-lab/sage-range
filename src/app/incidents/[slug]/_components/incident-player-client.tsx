"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { resolveNetworkState, type NetworkNode, type NetworkEvent } from "@/lib/network-map";
import { NetworkMap } from "./network-map";

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
              <p className="text-xs font-mono text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1">
                Hint {h.level} (-{h.pointCost} pts): {h.text}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed((r) => [...r, h.level])}
                className="text-xs text-zinc-500 hover:text-amber-400 underline underline-offset-2"
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
    <div
      className={`rounded-xl border p-5 transition ${
        completed
          ? "border-sage-500/40 bg-sage-500/5"
          : unlocked
          ? "border-white/10 bg-zinc-900/60"
          : "border-white/5 bg-zinc-950/40 opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">
          <span className="text-zinc-500 font-mono mr-2">Task {index + 1}</span>
          {task.title}
        </h3>
        <span className="text-xs font-mono text-zinc-500">{task.points} pts</span>
      </div>

      {!unlocked && <p className="text-xs text-zinc-600">Complete the previous task to unlock.</p>}

      {unlocked && !completed && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">{task.prompt}</p>
          <form onSubmit={submit} className="space-y-2">
            {task.answerType === "FREE_TEXT" ? (
              <div className="flex gap-2">
                <input
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 rounded-lg bg-zinc-950 border border-white/10 px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-sage-500/50"
                />
                <button
                  type="submit"
                  disabled={submitting || !freeText}
                  className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-40"
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
                    <span className="text-sm text-zinc-200">{opt}</span>
                  </label>
                ))}
                <button
                  type="submit"
                  disabled={submitting || !radioChoice}
                  className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-40"
                >
                  Submit
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
          </form>
          <HintList hints={task.hints} />
        </div>
      )}

      {completed && <p className="text-sm font-mono text-sage-400">✓ Completed</p>}
    </div>
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
          <span className="text-xs uppercase tracking-widest text-sage-500 font-mono">{simulation.codename}</span>
          <span className="text-xs font-bold text-amber-400 font-mono">{simulation.difficulty}</span>
          <span className="text-xs text-zinc-500 font-mono">~{simulation.estimatedMinutes} min</span>
          <span className="text-xs font-bold text-zinc-400 font-mono">{simulation.points} pts</span>
        </div>
        <h1 className="text-2xl font-bold">{simulation.title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{simulation.company.name}</p>
        <p className="text-zinc-300 mt-3 max-w-3xl leading-relaxed">{simulation.briefing}</p>

        <div className="mt-4 rounded-lg border border-white/8 bg-zinc-900/40 p-4 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Company Environment</p>
          <p className="text-sm text-zinc-300">{simulation.company.description}</p>
          {simulation.company.networkNotes && (
            <p className="text-xs text-zinc-500 mt-2 font-mono">{simulation.company.networkNotes}</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 max-w-xs h-1.5 rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-sage-500 transition-all"
              style={{ width: `${tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 font-mono">{doneCount}/{tasks.length} tasks</span>
        </div>
      </header>

      {resolvedNodes && (
        <div className="mb-6">
          <NetworkMap nodes={resolvedNodes} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* Artifacts panel */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-white/8 p-2">
            {artifacts.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveArtifact(a.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeArtifact === a.id || (!activeArtifact && a.id === artifacts[0]?.id)
                    ? "bg-sage-500 text-black"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {ARTIFACT_LABEL[a.type] ?? a.type}
              </button>
            ))}
          </div>
          {active && (
            <div className="p-4">
              <p className="text-sm font-semibold text-zinc-200 mb-3">{active.title}</p>
              <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap overflow-x-auto bg-zinc-950 border border-white/8 rounded-lg p-4 max-h-[560px] overflow-y-auto">
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
            <div className="rounded-xl border border-sage-500/40 bg-sage-500/5 p-5">
              <h3 className="font-bold text-sage-400 text-base mb-1">Simulation Complete</h3>
              <p className="text-sm text-zinc-400 mb-4">
                You reconstructed the full attack chain for {simulation.codename} and produced containment and
                reporting recommendations — exactly the workflow of a real incident response engagement.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/incidents/${simulation.slug}/evidence-board`}
                  className="rounded-lg bg-sage-500 px-4 py-2.5 text-center text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition"
                >
                  Continue to Evidence Board →
                </Link>
                <Link
                  href={`/incidents/${simulation.slug}/report`}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-zinc-200 hover:border-white/30 transition"
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
