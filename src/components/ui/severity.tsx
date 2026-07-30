import { cn } from "@/lib/utils";
import { OctagonAlert, TriangleAlert, Equal, Info, Minus } from "lucide-react";

// Severity — HOW BAD a finding is. Deliberately separate from <Badge>, which
// says WHAT HAPPENED to it. Keeping the two ramps apart is what lets a
// "high severity, resolved" incident render truthfully.
//
// Every level carries a glyph as well as a hue, so severity survives
// colourblindness, greyscale printing, and a screenshot pasted into a report.
// Squared corners and mono type distinguish it at a glance from a status pill.

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type SeverityLevel = (typeof SEVERITIES)[number];

const LEVELS: Record<SeverityLevel, { className: string; Icon: typeof Info; label: string }> = {
  critical: { className: "text-sev-critical border-sev-critical/45 bg-sev-critical/10", Icon: OctagonAlert,  label: "Critical" },
  high:     { className: "text-sev-high border-sev-high/45 bg-sev-high/10",             Icon: TriangleAlert, label: "High" },
  medium:   { className: "text-sev-medium border-sev-medium/45 bg-sev-medium/10",       Icon: Equal,         label: "Medium" },
  low:      { className: "text-sev-low border-sev-low/45 bg-sev-low/10",                Icon: Info,          label: "Low" },
  info:     { className: "text-sev-info border-sev-info/45 bg-sev-info/10",             Icon: Minus,         label: "Info" },
};

/** Normalises the various casings the API and seed data use ("HIGH", "High", "high"). */
export function toSeverity(value: string | null | undefined): SeverityLevel {
  const v = (value ?? "").trim().toLowerCase();
  return (SEVERITIES as readonly string[]).includes(v) ? (v as SeverityLevel) : "info";
}

export function Severity({
  level,
  showIcon = true,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  level: SeverityLevel;
  showIcon?: boolean;
}) {
  const { className: tone, Icon, label } = LEVELS[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5",
        "font-mono text-[10px] font-medium uppercase tracking-[0.08em] leading-[18px]",
        tone,
        className
      )}
      {...props}
    >
      {showIcon && <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />}
      {children ?? label}
    </span>
  );
}

/**
 * The 8px square used in legends and dense list rows, where a full tag is too
 * heavy. Always pair it with the level name in adjacent text — the swatch alone
 * conveys meaning by colour only.
 */
export function SeverityDot({ level, className }: { level: SeverityLevel; className?: string }) {
  const FILLS: Record<SeverityLevel, string> = {
    critical: "bg-sev-critical",
    high:     "bg-sev-high",
    medium:   "bg-sev-medium",
    low:      "bg-sev-low",
    info:     "bg-sev-info",
  };
  return <span aria-hidden="true" className={cn("inline-block h-2 w-2 shrink-0", FILLS[level], className)} />;
}
