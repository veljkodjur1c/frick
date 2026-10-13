import { Card, EmptyState, Skeleton } from "@/components/ui";
import { TaskBoard } from "./TaskBoard";
import { getCurrentWeekTasks } from "./queries";

/** Reads the session, so it must sit inside a <Suspense> boundary. */
export async function TaskList() {
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
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-2.5 w-full" rounded="full" />
        <Skeleton className="h-4 w-48" />
      </Card>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full" />
        <Card padding="sm" className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
