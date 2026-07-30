import { cn } from "@/lib/utils";

// Standard page header: eyebrow (optional) → title → subtitle, with an optional
// actions slot on the right. Gives every page the same top-of-page rhythm.
//
// The eyebrow is mono — it's a category label, not prose — and neutral rather
// than accent-coloured, so it stops competing with genuinely interactive text.

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-medium tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
