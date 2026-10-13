import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  /** Right side, usually one small Button or an Avatar. */
  action?: ReactNode;
  /**
   * Tab pages leave it off: the title is only for screen readers, so the content starts right under the top bar.
   * Pages without the top bar or tabs (login, /design) show it.
   */
  showTitle?: boolean;
  className?: string;
};

/** Top of every page. The only place an h1 should come from. */
export function PageHeader({ title, subtitle, action, showTitle = false, className }: PageHeaderProps) {
  const heading = (
    <h1 className={showTitle ? "font-display text-2xl leading-tight font-bold text-gold-200" : "sr-only"}>{title}</h1>
  );
  if (!showTitle && !subtitle && !action) return heading;

  return (
    <header className={cn("flex justify-between gap-3", showTitle ? "mb-5 items-start" : "mb-4 items-center", className)}>
      <div className="min-w-0">
        {heading}
        {subtitle && <p className={cn("text-sm text-fg-muted", showTitle && "mt-1")}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
