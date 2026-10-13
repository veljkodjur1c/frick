import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { TaskList, TaskListSkeleton } from "@/features/tasks/TaskList";

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Taskovi" />
      {/* Reads the session (cookies), so with Cache Components it streams in behind a boundary. */}
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList />
      </Suspense>
    </>
  );
}
