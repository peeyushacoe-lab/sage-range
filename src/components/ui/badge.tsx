import { cn } from "@/lib/utils";

// Vault badge / pill. Tone-based so status colouring is consistent everywhere
// (emerald=success/active, blue=info, amber=pending/warn, red=error, zinc=neutral).

type Tone = "emerald" | "blue" | "amber" | "red" | "zinc" | "purple";

const TONES: Record<Tone, string> = {
  emerald: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  blue:    "text-blue-400 border-blue-500/40 bg-blue-500/10",
  amber:   "text-amber-400 border-amber-500/40 bg-amber-500/10",
  red:     "text-red-400 border-red-500/40 bg-red-500/10",
  zinc:    "text-zinc-400 border-white/15 bg-white/5",
  purple:  "text-purple-400 border-purple-500/40 bg-purple-500/10",
};

export function Badge({
  tone = "zinc", className, ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
