import { cn } from "@/lib/utils";

// Vault button. `buttonVariants()` is exported so <Link> can share the exact
// same styling (link-that-looks-like-a-button) without duplicating classes.

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent",
  secondary: "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:border-white/20",
  ghost:     "border border-transparent text-zinc-400 hover:text-white hover:bg-white/5",
  danger:    "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20",
};

const SIZES: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2 rounded-lg gap-2",
  lg: "text-sm px-5 py-2.5 rounded-xl gap-2",
};

export function buttonVariants({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
    VARIANTS[variant],
    SIZES[size]
  );
}

export function Button({
  variant, size, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
