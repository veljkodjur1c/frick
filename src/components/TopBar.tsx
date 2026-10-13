"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** App logo and name on the left, the profile avatar (passed in from the server) on the right. */
export function TopBar({ profile }: { profile: ReactNode }) {
  const pathname = usePathname();

  // The login page has no profile yet.
  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="flex h-14 items-center justify-between px-4 pt-2">
      <span className="flex items-center gap-2 font-display text-lg font-bold text-gold-300">
        {/* The same file as the favicon (npm run icons); decorative, the name is next to it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon.svg" alt="" width={32} height={32} className="size-8" />
        FRICK
      </span>
      {profile}
    </header>
  );
}
