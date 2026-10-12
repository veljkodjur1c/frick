"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  /** Shown on the right, e.g. a points <Badge>. */
  aside?: ReactNode;
  /** Cross out the label when checked (done tasks). */
  strike?: boolean;
};

/** A full-width tappable row with a checkbox. Built for `check` tasks, works for any yes/no choice. */
export function Checkbox({ label, description, aside, strike = false, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "group flex min-h-11 cursor-pointer items-center gap-3 select-none has-disabled:cursor-not-allowed has-disabled:opacity-40",
        className,
      )}
    >
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-gold-500 transition",
          "group-has-checked:border-hextech-300 group-has-checked:bg-hextech-300",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hextech-300",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-4 text-abyss opacity-0 transition group-has-checked:opacity-100">
          <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-base text-fg transition",
            strike && "group-has-checked:text-fg-muted group-has-checked:line-through",
          )}
        >
          {label}
        </span>
        {description && <span className="mt-0.5 block text-sm text-fg-muted">{description}</span>}
      </span>
      {aside && <span className="shrink-0">{aside}</span>}
    </label>
  );
}
