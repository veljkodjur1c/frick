"use client";

import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<Option<T>>;
  /** null: nothing chosen yet (for a required choice without a default). */
  value: T | null;
  onChange: (value: T) => void;
  /** Accessible name, e.g. "Prikaz taskova". */
  label: string;
  fullWidth?: boolean;
  /** With fullWidth: options per row. Defaults to all in one row; set it for 5+ options (e.g. task categories). */
  columns?: number;
  className?: string;
};

/**
 * Switch between 2 to 4 views of the same list: Svi / Tim / Solo, Ova nedelja / Prošla.
 * With `fullWidth` and `columns` it also works as a single choice from more options that wrap into rows.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
  columns,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "gap-1 rounded-md border border-line bg-deep p-1",
        fullWidth ? "grid w-full" : "inline-flex",
        className,
      )}
      style={fullWidth ? { gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-sm px-3 text-sm font-semibold transition",
              selected ? "bg-surface text-gold-200 ring-1 ring-gold-500" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
