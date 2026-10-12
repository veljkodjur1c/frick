"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// text-base (16px) on purpose: smaller text makes iOS zoom in when the field is focused.
const FIELD =
  "w-full rounded-md border border-line bg-raised px-3 text-base text-fg placeholder:text-fg-faint transition " +
  "focus:border-hextech-300 focus:outline-none disabled:opacity-40 " +
  "aria-invalid:border-danger";

type FieldShellProps = {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

function FieldShell({ id, label, hint, error, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-message`} className="text-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type SharedProps = {
  label?: ReactNode;
  /** Helper text under the field. Hidden while there is an error. */
  hint?: ReactNode;
  /** Error text. Also marks the field invalid. */
  error?: ReactNode;
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & SharedProps;

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-message` : undefined}
        className={cn(FIELD, "h-11")}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & SharedProps;

export function Textarea({ label, hint, error, className, id, rows = 3, ...props }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-message` : undefined}
        className={cn(FIELD, "resize-none py-2.5 leading-relaxed")}
        {...props}
      />
    </FieldShell>
  );
}
