import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { type IconName } from "./icon";
import { IconTile } from "./icon-tile";

// Professional empty state: icon → title → description → optional CTA. Replaces
// ad-hoc "No X found" text so every empty surface reads as intentional and
// points the user at their next action.

export function EmptyState({
  icon = "sageVault",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-14", className)}>
      <IconTile name={icon} size={56} interactive={false} className="mb-4" />
      <p className="text-base font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-3 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && (
        <Link href={action.href} className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-5")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
