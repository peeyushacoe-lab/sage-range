import { cn } from "@/lib/utils";

// Range badge / pill. STATUS ONLY — what happened to a thing.
//
// For how bad a finding is, use <Severity> instead. Keeping them separate is
// what lets a "high severity, resolved" incident render truthfully; the old
// single-ramp badge made "Active" and "Resolved" visually identical.
//
// The colour-named tones are retained as deprecated aliases so existing call
// sites keep working. New code should use the semantic names.

type Tone =
  | "ok" | "info" | "warn" | "danger" | "neutral"
  /** @deprecated colour-named tones — use the semantic name instead */
  | "emerald" | "blue" | "amber" | "red" | "zinc" | "purple";

const TONES: Record<Tone, string> = {
  ok:      "text-ok border-ok-edge bg-ok-wash",
  info:    "text-info border-info-edge bg-info-wash",
  warn:    "text-warn border-warn-edge bg-warn-wash",
  danger:  "text-danger border-danger-edge bg-danger-wash",
  neutral: "text-ink-2 border-edge-strong bg-surface-2",

  emerald: "text-ok border-ok-edge bg-ok-wash",
  blue:    "text-info border-info-edge bg-info-wash",
  amber:   "text-warn border-warn-edge bg-warn-wash",
  red:     "text-danger border-danger-edge bg-danger-wash",
  zinc:    "text-ink-2 border-edge-strong bg-surface-2",
  purple:  "text-accent border-accent-edge bg-accent-wash",
};

export function Badge({
  tone = "neutral", dot = true, className, children, ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** The leading dot. Keep it on — it distinguishes a status pill from a severity tag at a glance. */
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        TONES[tone],
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}
