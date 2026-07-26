import { cn } from "@/lib/utils";

// Vault surface primitive. Codifies the dominant existing card vocabulary
// (rounded-xl border border-white/8 bg-zinc-900/40) so every surface matches.

export function Card({ className, interactive, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/8 bg-zinc-900/40",
        interactive && "transition-colors hover:border-white/15 hover:bg-zinc-900/60",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-white/8", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs uppercase tracking-widest text-zinc-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
