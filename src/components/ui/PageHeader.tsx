import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  /** Right side, usually one small Button or an Avatar. */
  action?: ReactNode;
  className?: string;
};

/** Top of every tab page. The only place an h1 should come from. */
export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-5 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl leading-tight font-bold text-gold-200">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
