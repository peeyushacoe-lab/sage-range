"use client";

import { useCallback, useEffect, useState } from "react";

import { NoCopy } from "@/components/ui/no-copy";

// Shared presentational components used by lab client components

export function TaskShell({
  number,
  title,
  unlocked,
  completed,
  children,
}: {
  number: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <NoCopy
      className={`rounded-lg border p-5 transition-colors ${
        completed
          ? "border-sage-500/40 bg-sage-500/5"
          : unlocked
            ? "border-white/10 bg-black/30"
            : "border-white/5 bg-black/20 opacity-50 pointer-events-none select-none"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-mono text-zinc-500">Task {number}</span>
        <span className="font-semibold text-sm text-zinc-100">{title}</span>
        <span className="ml-auto">
          {completed ? (
            <StatusBadge variant="success">Completed</StatusBadge>
          ) : unlocked ? (
            <StatusBadge variant="active">In Progress</StatusBadge>
          ) : (
            <StatusBadge variant="locked">Locked</StatusBadge>
          )}
        </span>
      </div>
      {unlocked && children}
    </NoCopy>
  );
}

export function StatusBadge({
  variant,
  children,
}: {
  variant: "success" | "active" | "locked";
  children: React.ReactNode;
}) {
  const cls =
    variant === "success"
      ? "bg-sage-500/20 text-sage-400 border-sage-500/30"
      : variant === "active"
        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
        : "bg-zinc-800 text-zinc-500 border-zinc-700";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  );
}

export function QueryDisplay({ query }: { query: string }) {
  return (
    <div className="rounded-lg bg-zinc-950 border border-white/8 p-3">
      <code className="font-mono text-xs text-zinc-400 break-all">{query}</code>
    </div>
  );
}

export function MonoInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/50 ${className}`}
    />
  );
}

export function SubmitBtn({ label = "Submit" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="rounded bg-sage-500 px-4 py-2 text-sm font-medium text-black hover:bg-sage-400 transition-colors"
    >
      {label}
    </button>
  );
}

/**
 * Submit one task stage for marking.
 *
 * The answer key lives on the server (src/lib/labs/stage-answers.ts) and the
 * grading happens there, so a lab component never knows the answer and cannot
 * be talked into recording a completion it did not earn. Wrong attempts are
 * counted server-side too, which is why there is no separate call for them.
 *
 * Returns the verdict, plus the canonical flag once the answer is right so the
 * UI can echo it back without having shipped it.
 */
export async function verifyStage(
  labId: string,
  stage: string,
  answer: string,
): Promise<{ correct: boolean; reveal?: string; fields?: Record<string, boolean> }> {
  try {
    const res = await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: answer }),
    });
    if (!res.ok) return { correct: false };
    const data = (await res.json()) as {
      correct?: boolean;
      reveal?: string;
      fields?: Record<string, boolean>;
    };
    return { correct: data.correct === true, reveal: data.reveal, fields: data.fields };
  } catch {
    return { correct: false };
  }
}

/**
 * Flags a learner has already earned on this lab.
 *
 * Completion messages used to hard-code the flag they reveal, which put every
 * one of them in the bundle for anyone who opened devtools. They are fetched
 * instead, and the server only returns the ones whose stage this user has
 * actually completed. `addReveal` folds in a flag earned during this session so
 * the message appears immediately rather than after a reload.
 */
export function useRevealedFlags(
  labId: string,
): [Record<string, string>, (stage: string, flag?: string) => void] {
  const [flags, setFlags] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    void fetch(`/api/labs/reveals?labId=${encodeURIComponent(labId)}`)
      .then((res) => (res.ok ? res.json() : { flags: {} }))
      .then((data: { flags?: Record<string, string> }) => {
        if (live) setFlags(data.flags ?? {});
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [labId]);

  const addReveal = useCallback((stage: string, flag?: string) => {
    if (!flag) return;
    setFlags((prev) => ({ ...prev, [stage]: flag }));
  }, []);

  return [flags, addReveal];
}
