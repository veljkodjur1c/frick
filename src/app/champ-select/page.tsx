import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ChampSelectSkeleton, ChampSelectView } from "@/features/champ-select/ChampSelectView";

export default function ChampSelectPage() {
  return (
    <>
      <PageHeader title="Champ select" subtitle="Biramo taskove za sledeću nedelju" />
      {/* Reads the session (cookies), so with Cache Components it streams in behind a boundary. */}
      <Suspense fallback={<ChampSelectSkeleton />}>
        <ChampSelectView />
      </Suspense>
    </>
  );
}
