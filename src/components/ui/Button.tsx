import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one main action on a screen (Pošalji, Završi task).
  primary: "bg-hextech-300 text-abyss hover:brightness-110 active:bg-hextech-500",
  // Everything else that matters.
  secondary:
    "border border-gold-500 text-gold-100 hover:border-gold-300 active:bg-raised",
  // Low-emphasis actions (Otkaži, Prikaži još).
  ghost: "text-fg-muted hover:bg-raised hover:text-fg",
  // Positive vote / confirm (Legit).
  success: "border border-success/40 bg-success/15 text-success active:bg-success/25",
  // Negative vote / destructive (Cap, Obriši).
  danger: "border border-danger/40 bg-danger/15 text-danger active:bg-danger/25",
};

// md and lg are at least 44px tall so they are easy to tap.
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-11 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-base",
  // Square 48px tile with only an icon (e.g. the camera on a proof task). Give it an aria-label.
  icon: "size-12 shrink-0",
};

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Button classes without the <button>. Use it to style a Next <Link> like a button:
 * <Link href="/tasks" className={buttonClasses({ variant: "secondary" })}>Taskovi</Link>
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-md font-semibold whitespace-nowrap transition",
    "disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleOptions & {
    /** Shows a spinner and disables the button. */
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
