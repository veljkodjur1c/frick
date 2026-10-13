"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** App name on the left, the profile avatar (passed in from the server) on the right. */
export function TopBar({ profile }: { profile: ReactNode }) {
  const pathname = usePathname();

  // The login page has no profile yet.
  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="flex h-14 items-center justify-between px-4 pt-2">
      <span className="font-display text-lg font-bold text-gold-300">Nexus</span>
      {profile}
    </header>
  );
}
