import { cn } from "@/lib/utils";

// Vault progress bar. `value` is 0-100. Colour shifts with completion unless a
// fixed tone is forced.

export function ProgressBar({
  value,
  className,
  barClassName,
  tone,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  tone?: "emerald" | "amber" | "red";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const auto = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  const color = tone ? { emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[tone] : auto;
  return (
    <div className={cn("h-2 w-full rounded-full bg-white/8 overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all", color, barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
