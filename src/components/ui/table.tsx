import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// Range data table. 36px rows, sticky header, hairline dividers.
//
// Replaces the hand-rolled <table> markup scattered across the app. Sorting is
// announced via aria-sort, and the sort control is a real <button> so it works
// from the keyboard.

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

/** Wrap a Table in this when it can overflow — keeps the sticky header working. */
export function TableScroll({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-auto", className)} {...props} />;
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-edge-subtle transition-colors duration-fast ease-out hover:bg-surface-2", className)}
      {...props}
    />
  );
}

export function TH({
  className,
  align = "left",
  sort,
  onSort,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right";
  /** Omit for a non-sortable column. */
  sort?: "asc" | "desc" | "none";
  onSort?: () => void;
}) {
  const ariaSort = sort === "asc" ? "ascending" : sort === "desc" ? "descending" : sort === "none" ? "none" : undefined;
  const SortIcon = sort === "asc" ? ChevronUp : sort === "desc" ? ChevronDown : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "sticky top-0 z-sticky h-8 whitespace-nowrap border-b border-edge bg-surface-2 px-3",
        "font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    >
      {sort && onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 uppercase tracking-[0.14em] transition-colors duration-fast",
            "hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2",
            sort !== "none" && "text-ink-2"
          )}
        >
          {children}
          <SortIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TD({
  className,
  align = "left",
  numeric,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right";
  /** Tabular figures, so a column of numbers doesn't reflow as values change. */
  numeric?: boolean;
}) {
  return (
    <td
      className={cn(
        "h-row px-3 text-ink-2",
        align === "right" ? "text-right" : "text-left",
        numeric && "font-mono tabular-nums",
        className
      )}
      {...props}
    />
  );
}
