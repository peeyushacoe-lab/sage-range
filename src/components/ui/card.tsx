import { cn } from "@/lib/utils";

// Range surface primitive. Opaque, not translucent — elevation comes from a
// lightness step so a card nested inside a modal still reads correctly.
//
// `interactive` changes border and background only. It never translates or
// scales: hover must not shift layout bounds on dense screens.

export function Card({ className, interactive, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-edge bg-surface-1",
        interactive && "transition-colors duration-fast ease-out hover:border-edge-strong hover:bg-surface-2",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-4 py-3 border-b border-edge-subtle", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-card", className)} {...props} />;
}
