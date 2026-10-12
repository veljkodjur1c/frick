import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "inset" | "framed";
export type CardPadding = "none" | "sm" | "md";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
};

type CardProps = HTMLAttributes<HTMLElement> & {
  /**
   * default: regular content (feed post, task list).
   * inset:   a quieter box inside another card.
   * framed:  gold Hextech frame with cut corners. Only for special things:
   *          the boss, rank, weekly awards, rewards. Max one or two per screen.
   */
  variant?: CardVariant;
  padding?: CardPadding;
  as?: "div" | "section" | "article" | "li";
};

export function Card({
  variant = "default",
  padding = "md",
  as: Tag = "div",
  className,
  children,
  ...props
}: CardProps) {
  if (variant === "framed") {
    // The outer layer is the gold gradient "border", the inner layer is the card itself.
    return (
      <Tag
        className={cn("chamfer bg-linear-to-b from-gold-300 via-gold-500 to-gold-700 p-px", className)}
        {...props}
      >
        <div className={cn("chamfer h-full bg-surface [--chamfer:9.6px]", PADDING[padding])}>
          {children}
        </div>
      </Tag>
    );
  }

  return (
    <Tag
      className={cn(
        variant === "default" && "rounded-lg border border-line bg-surface shadow-card",
        variant === "inset" && "rounded-md bg-deep",
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
