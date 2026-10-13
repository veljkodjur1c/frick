"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/feed", label: "Feed" },
  { href: "/tasks", label: "Taskovi" },
  { href: "/boss", label: "Boss" },
  { href: "/shelf", label: "Polica" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // Every tab needs a login, so the bar would only lead back here.
  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-deep/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TABS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center justify-center text-sm font-semibold transition-colors",
                  active ? "text-gold-200" : "text-fg-muted hover:text-fg",
                )}
              >
                {active && (
                  <span aria-hidden className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 bg-gold-300" />
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
