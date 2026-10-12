import { BottomNav } from "./BottomNav";

/** Mobile-first frame: centered column, safe-area padding and the bottom tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <main className="flex-1 px-4 pt-4 pb-[calc(4rem_+_env(safe-area-inset-bottom)_+_1rem)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
