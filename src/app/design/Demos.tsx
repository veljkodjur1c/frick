"use client";

import { useState } from "react";
import {
  Badge,
  BossHealthBar,
  Button,
  Checkbox,
  SegmentedControl,
  Sheet,
} from "@/components/ui";
import { TaskIcon } from "@/features/tasks/TaskRow";
import { CATEGORY_INFO, TASK_CATEGORIES, type TaskCategory } from "@/lib/game/titles";

// Interactive bits of the /design page. Not for use in features.

export function BossDemo() {
  const hp = 2000;
  const [damage, setDamage] = useState(760);

  return (
    <div className="flex flex-col gap-4">
      <BossHealthBar hp={hp} damage={damage} label="Baron Nashor" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setDamage((d) => Math.min(d + 180, hp))}>
          Udari (+180)
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDamage(760)}>
          Resetuj
        </Button>
      </div>
    </div>
  );
}

const TASKS = [
  { id: "gym", label: "Trening u teretani", description: "Treba slika kao dokaz", points: 40, scope: "solo" },
  { id: "read", label: "Pročitaj 20 strana", description: "Bilo koja knjiga", points: 20, scope: "team" },
  { id: "water", label: "2 litre vode dnevno", description: "Svih 7 dana", points: 30, scope: "team" },
] as const;

type Filter = "all" | "team" | "solo";

export function TaskListDemo() {
  const [filter, setFilter] = useState<Filter>("all");
  const [done, setDone] = useState<Record<string, boolean>>({ read: true });

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label="Prikaz taskova"
        fullWidth
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Svi" },
          { value: "team", label: "Tim" },
          { value: "solo", label: "Solo" },
        ]}
      />
      <ul className="flex flex-col divide-y divide-line">
        {TASKS.filter((task) => filter === "all" || task.scope === filter).map((task) => (
          <li key={task.id} className="py-1">
            <Checkbox
              strike
              label={task.label}
              description={task.description}
              checked={done[task.id] ?? false}
              onChange={(e) => setDone((prev) => ({ ...prev, [task.id]: e.target.checked }))}
              aside={<Badge tone="gold">+{task.points}</Badge>}
            />
          </li>
        ))}
      </ul>
      <Checkbox
        size="lg"
        icon={<TaskIcon />}
        strike
        label='Velika kockica (size="lg"), za redove taskova'
        checked={done.big ?? false}
        onChange={(e) => setDone((prev) => ({ ...prev, big: e.target.checked }))}
      />
    </div>
  );
}

/** SegmentedControl with `columns`: one choice out of more options, wrapping into rows. */
export function CategoryPickerDemo() {
  const [category, setCategory] = useState<TaskCategory>("caffeine");

  return (
    <SegmentedControl
      label="Kategorija"
      fullWidth
      columns={2}
      value={category}
      onChange={setCategory}
      options={TASK_CATEGORIES.map((value) => ({ value, label: CATEGORY_INFO[value].title }))}
    />
  );
}

export function SheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Otvori glasanje
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Da li je legit?"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" size="lg" onClick={() => setOpen(false)}>
              Cap
            </Button>
            <Button variant="success" size="lg" onClick={() => setOpen(false)}>
              Legit
            </Button>
          </div>
        }
      >
        <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-raised text-sm text-fg-muted">
          Slika dokaza
        </div>
        <p className="mt-3 text-sm text-fg-muted">
          Marko je završio „Trening u teretani“. Potrebna su 2 Legit glasa.
        </p>
      </Sheet>
    </>
  );
}
