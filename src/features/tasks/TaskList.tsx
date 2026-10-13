import Link from "next/link";
import { Card, EmptyState, Skeleton, buttonClasses } from "@/components/ui";
import { syncWeekPhase } from "@/features/week/weekPhase";
import { isChampSelectOpen } from "@/lib/game/champSelect";
import { TaskBoard } from "./TaskBoard";
import { getCurrentWeekTasks } from "./queries";

/** Reads the session, so it must sit inside a <Suspense> boundary. */
export async function TaskList() {
  // On Sunday evening this opens champ select; on Monday it turns the approved proposals into tasks.
  await syncWeekPhase();
  const content = await currentWeekContent();

  // syncWeekPhase() checked the session, so reading the clock here is allowed.
  if (!isChampSelectOpen(new Date())) return content;
  return (
    <div className="flex flex-col gap-6">
      <ChampSelectBanner />
      {content}
    </div>
  );
}

function ChampSelectBanner() {
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-fg">
        Champ select je otvoren
        <span className="block text-sm text-fg-muted">Predloži i izglasaj taskove za sledeću nedelju do ponoći.</span>
      </p>
      <Link href="/champ-select" className={buttonClasses({ fullWidth: true })}>
        Idi na champ select
      </Link>
    </Card>
  );
}

async function currentWeekContent() {
  const week = await getCurrentWeekTasks();

  if (week.state === "none" || (week.state === "inactive" && week.status === "finished")) {
    return (
      <EmptyState
        title="Nema aktivne nedelje"
        description="Taskovi se otvaraju kad počne nova nedelja, posle champ select-a u nedelju uveče."
      />
    );
  }

  if (week.state === "inactive") {
    return (
      <EmptyState
        title="Champ select je u toku"
        description="Predlozi i glasanje za taskove su otvoreni. Taskovi stižu kad nedelja počne u ponedeljak."
      />
    );
  }

  if (week.tasks.length === 0) {
    return (
      <EmptyState
        title="Nemaš taskove ove nedelje"
        description="Predloži svoje taskove u sledećem champ select-u."
      />
    );
  }

  return <TaskBoard tasks={week.tasks} />;
}

export function TaskListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-28" />
        <Skeleton className="h-2.5 w-full" rounded="full" />
      </Card>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
