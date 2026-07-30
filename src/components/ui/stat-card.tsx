import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "./card";

// Summary/overview tile — the "Summary Cards" row in the standard page layout
// (header → summary cards → content → actions).
//
// The value dropped from font-black to medium: weight 900 on a 30px numeral
// shouted over the label that gave it meaning. Numerals are tabular so a
// counter ticking 9 → 10 doesn't shift the layout.

export function StatCard({
  label,
  value,
  sub,
  delta,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Change since the previous period. Direction picks the icon and colour. */
  delta?: { direction: "up" | "down" | "flat"; text: React.ReactNode };
  /** Colours the value. Use only when the number itself is a status — e.g. open criticals. */
  tone?: "danger" | "warn" | "ok";
  className?: string;
}) {
  const TONES = { danger: "text-danger", warn: "text-warn", ok: "text-ok" } as const;

  const DELTA = {
    up:   { Icon: TrendingUp,   className: "text-ok" },
    down: { Icon: TrendingDown, className: "text-danger" },
    flat: { Icon: Minus,        className: "text-ink-3" },
  } as const;

  const Delta = delta ? DELTA[delta.direction] : null;

  return (
    <Card className={cn("p-card", className)}>
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <p className={cn("text-3xl font-medium leading-none tabular-nums", tone ? TONES[tone] : "text-ink")}>{value}</p>
      {delta && Delta && (
        <p className={cn("mt-2 flex items-center gap-1.5 text-xs", Delta.className)}>
          <Delta.Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {delta.text}
        </p>
      )}
      {sub && <p className="mt-1.5 text-xs text-ink-3">{sub}</p>}
    </Card>
  );
}
