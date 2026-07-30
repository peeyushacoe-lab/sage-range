"use client";

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
          ? "border-ok-edge bg-ok-wash"
          : unlocked
            ? "border-edge bg-black/30"
            : "border-edge-subtle bg-black/20 opacity-50 pointer-events-none select-none"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-mono text-ink-3">Task {number}</span>
        <span className="font-semibold text-sm text-ink">{title}</span>
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
      ? "bg-ok-wash text-ok border-ok-edge"
      : variant === "active"
        ? "bg-info-wash text-info border-info-edge"
        : "bg-surface-2 text-ink-3 border-edge-strong";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  );
}

export function QueryDisplay({ query }: { query: string }) {
  return (
    <div className="rounded-lg bg-surface-0 border border-edge p-3">
      <code className="font-mono text-xs text-ink-2 break-all">{query}</code>
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
      className={`rounded bg-surface-1 border border-edge px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge ${className}`}
    />
  );
}

export function SubmitBtn({ label = "Submit" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="rounded bg-accent-fill px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
    >
      {label}
    </button>
  );
}
