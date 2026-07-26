import { cn } from "@/lib/utils";
import { Card } from "./card";

// Summary/overview tile — the "Summary Cards" row in the standard page layout
// (header → summary cards → content → actions).

export function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
      <p className="text-3xl font-black tabular-nums text-zinc-100 leading-none">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1.5">{sub}</p>}
    </Card>
  );
}
