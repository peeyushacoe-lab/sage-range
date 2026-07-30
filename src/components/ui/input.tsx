"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";

// Range form field. Promotes the old `.input-field` utility to a real component
// so a label, a hint, and an error can't be forgotten.
//
// Rules encoded here rather than left to each call site:
//   - the label is always visible; a placeholder is not a label
//   - the error sits under its own field and is announced via role="alert"
//   - error text names the cause AND the fix ("Expected T1059.001", not "Invalid")
//   - aria-describedby wires hint and error to the input for screen readers

export function Field({
  label,
  hint,
  error,
  required,
  className,
  id: providedId,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "aria-invalid"> & {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Present = invalid. Say what went wrong and how to fix it. */
  error?: React.ReactNode;
}) {
  const autoId = useId();
  const id = providedId ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-[36px] w-full rounded-md border bg-surface-inset px-3 text-sm text-ink placeholder-ink-3",
          "transition-colors duration-fast ease-out focus:outline-none focus:ring-2",
          error
            ? "border-danger focus:border-danger focus:ring-danger/25"
            : "border-edge-strong focus:border-accent focus:ring-accent/25",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
