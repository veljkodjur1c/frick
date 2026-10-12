import { cn } from "@/lib/cn";

type DividerProps = {
  /**
   * With a label it becomes a gold section break, e.g. between weeks in the feed ("Prošla nedelja").
   * Without a label it is a plain hairline.
   */
  label?: string;
  className?: string;
};

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn("border-0 border-t border-line", className)} />;
  }

  return (
    <div role="separator" aria-label={label} className={cn("flex items-center gap-3", className)}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-gold-500" />
      <span aria-hidden className="size-1.5 rotate-45 bg-gold-300" />
      <span className="font-display text-sm font-semibold text-gold-300">{label}</span>
      <span aria-hidden className="size-1.5 rotate-45 bg-gold-300" />
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-gold-500" />
    </div>
  );
}
