import { cn } from "@/lib/utils";

// Range button. `buttonVariants()` is exported so <Link> can share the exact
// same styling (link-that-looks-like-a-button) without duplicating classes.
//
// One primary action per screen; everything else is secondary or ghost.
// `danger` is outlined rather than filled — destructive actions should be
// findable, not loud. Fill it only when destroying IS the primary action.

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-accent-fill text-white border border-transparent hover:bg-accent-hover",
  secondary: "border border-edge-strong bg-surface-2 text-ink hover:bg-surface-3",
  ghost:     "border border-transparent text-ink-2 hover:text-ink hover:bg-surface-2",
  danger:    "border border-danger-edge bg-transparent text-danger hover:bg-danger-wash",
};

// Minimum 36px keeps pointer targets comfortable; `lg` clears the 44px
// touch-target floor and is the right choice for a primary action on mobile.
const SIZES: Record<Size, string> = {
  sm: "min-h-[28px] text-xs px-3 rounded-md gap-1.5",
  md: "min-h-[36px] text-sm px-4 rounded-md gap-2",
  lg: "min-h-[44px] text-base px-5 rounded-md gap-2",
};

export function buttonVariants({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap cursor-pointer",
    "transition-colors duration-fast ease-out",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0",
    VARIANTS[variant],
    SIZES[size]
  );
}

export function Button({
  variant, size, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
