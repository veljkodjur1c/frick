import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ShelfView, ShelfViewSkeleton } from "@/features/shelf/ShelfView";

export default function ShelfPage() {
  return (
    <>
      <PageHeader title="Polica" subtitle="Za svakog oborenog bossa svi dobijaju po jednu limenku." />
      {/* Reads the session (cookies), so with Cache Components it streams in behind a boundary. */}
      <Suspense fallback={<ShelfViewSkeleton />}>
        <ShelfView />
      </Suspense>
    </>
  );
}
