import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

// Professional empty state: icon → title → description → optional CTA. Replaces
// ad-hoc "No X found" text so every empty surface reads as intentional and
// points the user at their next action.

export function EmptyState({
  icon = "✦",
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-14", className)}>
      <div
        className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-2xl text-zinc-500 mb-4"
        aria-hidden
      >
        {icon}
      </div>
      <p className="text-base font-semibold text-zinc-200">{title}</p>
      {description && <p className="text-sm text-zinc-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && (
        <Link href={action.href} className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-5")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
