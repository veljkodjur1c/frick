"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type SheetProps = {
  open: boolean;
  /** Called on the close button, a tap outside the sheet, Esc, and the Android back gesture. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky bottom area for the main action(s). */
  footer?: ReactNode;
};

/**
 * Bottom sheet built on the native <dialog>, so focus trapping and Esc come for free.
 * Use it for anything that would be a modal: proof upload, Legit/Cap voting, proposing a task.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a tap on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "mx-auto mt-auto mb-0 w-full max-w-md overflow-hidden rounded-t-lg border-x border-t border-line bg-deep p-0 text-fg shadow-sheet",
        "backdrop:bg-abyss/80 backdrop:backdrop-blur-sm",
        "transition-transform duration-200 ease-out starting:open:translate-y-full",
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-2 pb-3">
          <h2 id={titleId} className="font-display text-lg font-semibold text-gold-200">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="-mr-2 flex size-10 items-center justify-center rounded-md text-fg-muted hover:bg-raised hover:text-fg"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="size-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={cn("overflow-y-auto px-4", footer ? "pb-4" : "pb-[calc(1rem+env(safe-area-inset-bottom))]")}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
