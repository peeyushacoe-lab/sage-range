import { cn } from "@/lib/utils";

// Range progress bar. `value` is 0-100.
//
// Completion is ACCENT, not a pass/fail gradient. The old bar auto-coloured by
// value — red under 40%, amber under 70%, green above — which told a learner on
// lesson two of ten that something was wrong when nothing was. Progress is
// neutral information; only pass `tone` when the value genuinely encodes a
// result (a grade, a coverage threshold, a failing health check).

export function ProgressBar({
  value,
  className,
  barClassName,
  tone,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  tone?: "ok" | "warn" | "danger" | "emerald" | "amber" | "red";
  /** Accessible name. Without it the bar is announced as an unlabelled progressbar. */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  const TONES = {
    ok: "bg-ok", warn: "bg-warn", danger: "bg-danger",
    emerald: "bg-ok", amber: "bg-warn", red: "bg-danger",
  } as const;

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-inset", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-slow ease-out", tone ? TONES[tone] : "bg-accent", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
