"use client";

import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name, e.g. "Prikaz taskova". */
  label: string;
  fullWidth?: boolean;
  className?: string;
};

/** Switch between 2 to 4 views of the same list: Svi / Tim / Solo, Ova nedelja / Prošla. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
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
      style={fullWidth ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
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
