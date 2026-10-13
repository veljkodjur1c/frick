import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { BossView, BossViewSkeleton } from "@/features/boss/BossView";

export default function BossPage() {
  return (
    <>
      <PageHeader title="Boss" />
      <Suspense fallback={<BossViewSkeleton />}>
        <BossView />
      </Suspense>
    </>
  );
}
