"use client";

import { useOptimistic, useState } from "react";
import { Card, EmptyState, ProgressBar, SegmentedControl } from "@/components/ui";
import { weeklyProgress, type WeeklyProgress } from "@/lib/game/points";
import { formatNumber } from "@/lib/format";
import type { TaskData, TaskScope } from "./queries";
import { TaskRow } from "./TaskRow";

type Filter = "all" | TaskScope;

const FILTERS = [
  { value: "all", label: "Svi" },
  { value: "team", label: "Tim" },
  { value: "solo", label: "Solo" },
] as const;

/** The week's progress, the Svi / Tim / Solo switch and the task list. Ticks show up before the server answers. */
export function TaskBoard({ tasks }: { tasks: TaskData[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  // Rolls back by itself when the action's transition ends without new server data (an error).
  const [shownTasks, setTaskDone] = useOptimistic(tasks, (current, change: { id: string; done: boolean }) =>
    current.map((task) => (task.id === change.id ? { ...task, myStatus: change.done ? "approved" : null } : task)),
  );

  const progress = weeklyProgress({
    tasks: shownTasks,
    completions: shownTasks.flatMap((task) => (task.myStatus ? [{ taskId: task.id, status: task.myStatus }] : [])),
  });
  const visible = filter === "all" ? shownTasks : shownTasks.filter((task) => task.scope === filter);

  return (
    <div className="flex flex-col gap-6">
      <ProgressCard progress={progress} />
      <div className="flex flex-col gap-3">
        <SegmentedControl label="Prikaz taskova" options={FILTERS} value={filter} onChange={setFilter} fullWidth />
        {visible.length === 0 ? (
          <EmptyState
            title={filter === "team" ? "Nema timskih taskova" : "Nema solo taskova"}
            description="Prebaci na Svi da vidiš sve taskove ove nedelje."
          />
        ) : (
          <Card padding="sm">
            <ul className="flex flex-col divide-y divide-line">
              {visible.map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} onOptimisticDone={(done) => setTaskDone({ id: task.id, done })} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProgressCard({ progress }: { progress: WeeklyProgress }) {
  const { doneCount, totalCount, points, tasksUntilMinimum } = progress;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-fg-muted">Moji poeni ove nedelje</span>
        <span className="text-2xl font-semibold text-gold-200 tabular-nums">{formatNumber(points)}</span>
      </div>
      <ProgressBar
        label={`Završeno ${formatNumber(doneCount)} od ${formatNumber(totalCount)}`}
        value={doneCount}
        max={totalCount}
      />
      <p className="text-sm text-fg-muted">
        {tasksUntilMinimum > 0
          ? `Još ${formatNumber(tasksUntilMinimum)} ${taskWord(tasksUntilMinimum)} do minimuma.`
          : "Minimum za ovu nedelju je ispunjen."}
      </p>
    </Card>
  );
}

/** Serbian plural: 1 task, 2 taska, 5 taskova (11-14 taskova). */
function taskWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return "task";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "taska";
  return "taskova";
}
