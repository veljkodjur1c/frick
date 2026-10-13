import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { ProfileAvatarLink } from "@/features/profile/ProfileAvatarLink";
import { WeekSync } from "@/features/week/WeekSync";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

/** Mobile-first frame: centered column, safe-area padding, the top bar and the bottom tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <TopBar
        profile={
          <Suspense fallback={<Skeleton className="size-10" rounded="full" />}>
            <ProfileAvatarLink />
          </Suspense>
        }
      />
      <main className="flex-1 px-4 pt-4 pb-[calc(4rem_+_env(safe-area-inset-bottom)_+_1rem)]">
        {children}
      </main>
      <BottomNav />
      {/* Settles finished weeks and starts the new one; reads the session, so behind its own boundary. */}
      <Suspense fallback={null}>
        <WeekSync />
      </Suspense>
    </div>
  );
}
